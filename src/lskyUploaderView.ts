import {App, Editor, Notice, requestUrl, TFile, normalizePath} from 'obsidian';
import {AutoImageSettings, LskyImageListResponse, LskyUploadResponse} from './types';
import {i18n} from './i18n';

export class LskyUploaderView {
    private settings: AutoImageSettings;

    constructor(settings: AutoImageSettings) {
        this.settings = settings;
    }

    async upload(file: File, editor: Editor, insertPos: { line: number, ch: number }): Promise<void> {
        try {
            const {newUrl, ext} = await this.processFileUpload(file);
            const imageMarkdown = this.generateImageMarkdown(newUrl, ext);

            // 插入图片链接
            editor.replaceRange(imageMarkdown + '\n\n', insertPos);

            // 移动光标到新行
            const newLine = insertPos.line + 2;
            editor.setCursor({line: newLine, ch: 0});

        } catch (error) {
            new Notice(`${i18n.t.general.upload_failed}: ${(error as Error).message}`);
        }
    }

async deleteImages(selectedText: string, editor: Editor): Promise<void> {
    try {
        const urlRegex = /\bhttps?:\/\/[^\s)]+\.(jpeg|jpg|png|gif|tif|bmp|ico|psd|webp)/g;
        const imageUrls = selectedText.match(urlRegex)?.map(match => match.trim()) || [];

        if (imageUrls.length === 0) {
            new Notice(i18n.t.general.no_images_found);
            return;
        }

        let updatedSelection = selectedText;
        let errors: string[] = [];
        let successCount = 0;
        let skippedCount = 0;

        const headers = {
            'Accept': 'application/json',
            'Authorization': this.settings.token.startsWith('Bearer ') ? this.settings.token : 'Bearer ' + this.settings.token,
        };

        for (let i = 0; i < imageUrls.length; i++) {
            const imageUrl = imageUrls[i];

            // 检查是否超过 limit_count
            if (this.settings.limit_count > 0 && i >= this.settings.limit_count) {
                skippedCount++;
                continue;
            }

            const name = imageUrl.split("/").pop();
            if (!name) {
                errors.push(`${i18n.t.errors.invalid_image_url}: ${imageUrl}`);
                continue;
            }

            // 第一步：使用文件名第一个"-"前的部分作为关键词（精确搜索）
            const primaryKeyword = name.split("-")[0];

            // 第二步：如果没有找到，使用固定关键词"20"扩大搜索范围
            const fallbackKeyword = "20";

            let found = false;
            let searchErrors: string[] = [];

            // 搜索函数封装，避免重复代码
            const searchAndDelete = async (keyword: string, searchType: string): Promise<boolean> => {
                const requestUrlString = `${this.settings.apiBaseURL}/api/v1/images?keyword=${encodeURIComponent(keyword)}`;
                const response = await requestUrl({
                    url: requestUrlString,
                    method: 'GET',
                    headers: headers,
                    throw: false
                });

                if (response.status !== 200) {
                    searchErrors.push(`${searchType}搜索失败: ${response.status}`);
                    return false;
                }

                const responseData = response.json as LskyImageListResponse;
                const list = responseData.data.data;

                if (list.length > 0) {
                    for (const item of list) {
                        if (item.name === name) {
                            const deleteResponse = await requestUrl({
                                url: `${this.settings.apiBaseURL}/api/v1/images/${item.key}`,
                                method: 'DELETE',
                                headers: headers,
                                throw: false
                            });

                            if (deleteResponse.status === 200 || deleteResponse.text) {
                                updatedSelection = updatedSelection.replace(imageUrl, '');
                                successCount++;
                                return true;
                            } else {
                                searchErrors.push(`${i18n.t.errors.image_delete_failed}: ${deleteResponse.status}`);
                                return false;
                            }
                        }
                    }
                }
                return false;
            };

            // 第一步：精确搜索
            found = await searchAndDelete(primaryKeyword, "精确");

            // 第二步：如果没有找到，使用扩大范围搜索
            if (!found) {
                found = await searchAndDelete(fallbackKeyword, "扩大范围");
            }

            if (!found) {
                const errorMsg = searchErrors.length > 0
                    ? `${i18n.t.errors.image_not_found}: ${imageUrl} (${searchErrors.join('; ')})`
                    : `${i18n.t.errors.image_not_found}: ${imageUrl}`;
                errors.push(errorMsg);
            }
        }

        editor.replaceSelection(updatedSelection);

        // 显示结果通知
        if (errors.length > 0) {
            new Notice(`${i18n.t.errors.delete_errors}: \n${errors.join('\n')}`);
        }
        if (successCount > 0) {
            new Notice(i18n.getSuccessDeleteText(successCount));
        }
        if (skippedCount > 0) {
            new Notice(i18n.getLimitSkippedText('delete', this.settings.limit_count, skippedCount));
        } else if (errors.length === 0 && successCount === 0) {
            new Notice(i18n.t.results.no_images_deleted);
        }
    } catch {
        new Notice(`${i18n.t.general.delete_failed}`);
    }
}

    async uploadImage(selectedText: string, editor: Editor, app: App): Promise<void> {
        const urlRegex = /(!\[[^\]]*]\()([^)]+)(\))|(!\[\[([^\]]+)]])/gi;

        let match;
        let processedText = selectedText;
        let successCount = 0;
        let blacklistedCount = 0;
        let skippedCount = 0;
        let errors: string[] = [];
        let processedUrls = 0;

        while ((match = urlRegex.exec(selectedText)) !== null) {
            if (this.settings.limit_count > 0 && processedUrls >= this.settings.limit_count) {
                skippedCount++;
                continue;
            }

            processedUrls++;

            try {
                const fullMatch = match[0];
                const isInternalLink = match[4] !== undefined;
                const urlPart = isInternalLink ? match[5] : match[2];

                if (isInternalLink) {
                    // 处理内部链接 ![[filename]]
                    const fileName = urlPart;
                    const file = app.vault.getFiles().find((f: TFile) =>
                        f.name === fileName || f.basename === fileName.replace(/\.[^/.]+$/, "")
                    );

                    if (!file) {
                        errors.push(`${i18n.t.general.file_not_found}: ${fileName}`);
                        continue;
                    }

                    const {newUrl, ext} = await this.processLocalFile(file, app);
                    const replacement = this.generateImageMarkdown(newUrl, ext);
                    processedText = processedText.replace(fullMatch, replacement);
                    successCount++;

                    if (this.settings.is_need_delete) {
                        try {
                            await app.fileManager.trashFile(file);
                        } catch {
                            errors.push(`Failed to delete internal image`);
                        }
                    }

                } else {
                    // 处理普通URL图片 [alt](url)
                    if (urlPart.startsWith('http://') || urlPart.startsWith('https://')) {
                        // 网络图片处理逻辑
                        try {
                            const {newUrl, ext} = await this.processNetworkImage(urlPart);
                            const replacement = this.generateImageMarkdown(newUrl, ext);
                            processedText = processedText.replace(fullMatch, replacement);
                            successCount++;
                        } catch (error) {
                            if ((error as Error).message === 'blacklisted') {
                                blacklistedCount++;
                            } else {
                                errors.push(`${i18n.t.general.upload_failed}: ${(error as Error).message} - ${urlPart}`);
                            }
                        }

                    } else {
                        // 处理本地相对路径文件
                        const filePath = decodeURIComponent(urlPart);
                        const file = app.vault.getFiles().find((f: TFile) => f.path === filePath);

                        if (!file) {
                            errors.push(`${i18n.t.general.file_not_found}: ${filePath}`);
                            continue;
                        }

                        const {newUrl, ext} = await this.processLocalFile(file, app);
                        const replacement = this.generateImageMarkdown(newUrl, ext);
                        processedText = processedText.replace(fullMatch, replacement);
                        successCount++;

                        if (this.settings.is_need_delete) {
                            try {
                                await app.fileManager.trashFile(file);
                            } catch {
                                errors.push(`Failed to delete local image`);
                            }
                        }
                    }
                }

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                errors.push(`${i18n.t.general.network_error}: ${errorMessage}`);
            }
        }

        if (processedText !== selectedText) {
            editor.replaceSelection(processedText);
        }

        // 显示结果通知
        if (errors.length > 0) {
            new Notice(`${i18n.t.errors.errors_occurred}: \n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`);
        }
        if (blacklistedCount > 0) {
            new Notice(i18n.getBlacklistedSkippedText(blacklistedCount));
        }
        if (skippedCount > 0) {
            new Notice(i18n.getLimitSkippedText('upload', this.settings.limit_count, skippedCount));
        }
        if (successCount > 0) {
            new Notice(i18n.getSuccessUploadText(successCount));
        } else if (errors.length === 0 && blacklistedCount === 0 && skippedCount === 0) {
            new Notice(i18n.t.results.no_images_processed);
        }
    }

    // 下载图片方法
    // 新增下载图片方法
    async downloadImages(selectedText: string, app: App): Promise<void> {
        try {
            // 检查下载路径是否设置
            if (!this.settings.defaultDownloadPath) {
                new Notice(i18n.getDownloadPathNotSetText());
                return;
            }

            const urlRegex = /\bhttps?:\/\/[^\s)]+\.(jpeg|jpg|png|gif|tif|bmp|ico|psd|webp)/g;
            const imageUrls = selectedText.match(urlRegex)?.map(match => match.trim()) || [];

            if (imageUrls.length === 0) {
                new Notice(i18n.t.general.no_images_found);
                return;
            }

            let successCount = 0;
            let skippedCount = 0;
            let errors: string[] = [];

            // 确保下载目录存在
            try {
                const folderExists = await app.vault.adapter.exists(this.settings.defaultDownloadPath);
                if (!folderExists) {
                    await app.vault.createFolder(this.settings.defaultDownloadPath);
                }
            } catch (error) {
                errors.push(`创建下载目录失败: ${(error as Error).message}`);
            }

            for (let i = 0; i < imageUrls.length; i++) {
                const imageUrl = imageUrls[i];

                // 检查是否超过 limit_count
                if (this.settings.limit_count > 0 && i >= this.settings.limit_count) {
                    skippedCount++;
                    continue;
                }

                try {
                    const response = await requestUrl({
                        url: imageUrl,
                        method: 'GET',
                        throw: false
                    });

                    if (response.status !== 200) {
                        errors.push(`${i18n.t.errors.get_image_failed}: ${response.status} - ${imageUrl}`);
                        continue;
                    }

                    // 获取文件扩展名
                    const ext = this.getExtensionFromUrl(imageUrl) ||
                        this.getExtensionFromContentType(response.headers['content-type']) ||
                        'png';

                    // 生成文件名：原文件名_时间戳
                    const originalName = this.getOriginalFileName(imageUrl);
                    const timestamp = Date.now();
                    const fileName = `${originalName}_${timestamp}.${ext}`;
                    const filePath = normalizePath(`${this.settings.defaultDownloadPath}/${fileName}`);

                    // 保存文件
                    const arrayBuffer = response.arrayBuffer;
                    await app.vault.adapter.writeBinary(filePath, arrayBuffer);

                    successCount++;

                } catch {
                    errors.push(`${i18n.t.errors.image_download_failed}: ${imageUrl}`);
                }
            }

            // 显示结果通知
            if (errors.length > 0) {
                new Notice(`${i18n.t.errors.download_errors}: \n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`);
            }
            if (successCount > 0) {
                new Notice(i18n.getSuccessDownloadText(successCount));
            }
            if (skippedCount > 0) {
                new Notice(i18n.getLimitSkippedText('download', this.settings.limit_count, skippedCount));
            } else if (errors.length === 0 && successCount === 0) {
                new Notice(i18n.t.results.no_images_downloaded);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`${i18n.t.general.download_failed}: ${errorMessage}`);
        }
    }

// 新增方法：从URL中提取原文件名
    private getOriginalFileName(url: string): string {
        try {
            // 从URL中获取文件名（不包括扩展名）
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const fileNameWithExt = pathname.split('/').pop() || 'image';

            // 移除扩展名和URL编码
            const decodedName = decodeURIComponent(fileNameWithExt);
            const fileNameWithoutExt = decodedName.replace(/\.[^/.]+$/, "");

            // 如果文件名为空，使用默认名称
            return fileNameWithoutExt || 'image';
        } catch {
            return 'image';
        }
    }

    // 生成格式化的图片名称
    private getFormattedImageName(): string {
        const now = new Date();
        const Y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const i = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');
        return `${Y}${m}${d}${h}${i}${s}${ms}`;
    }

    // 从URL获取文件扩展名
    private getExtensionFromUrl(url: string): string | null {
        const match = url.match(/\.(jpeg|jpg|png|gif|tif|bmp|ico|psd|webp)/i);
        return match ? match[1].toLowerCase() : null;
    }

    // 从Content-Type获取文件扩展名
    private getExtensionFromContentType(contentType: string): string | null {
        const mimeToExt: { [key: string]: string } = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/tiff': 'tif',
            'image/bmp': 'bmp',
            'image/x-icon': 'ico',
            'image/vnd.adobe.photoshop': 'psd',
            'image/webp': 'webp',
        };
        return mimeToExt[contentType?.toLowerCase()] || null;
    }

    // 根据文件扩展名获取MIME类型
    private getMimeTypeFromExtension(ext: string): string {
        const mimeTypes: { [key: string]: string } = {
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'tif': 'image/tiff',
            'bmp': 'image/bmp',
            'ico': 'image/x-icon',
            'psd': 'image/vnd.adobe.photoshop',
            'webp': 'image/webp',
        };
        return mimeTypes[ext.toLowerCase()] || 'image/png';
    }

    // 上传文件到图床
    private async uploadToImageHost(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('strategy_id', this.settings.strategy_id.toString());
        // eslint-disable-next-line no-restricted-globals, no-undef
        const response = await fetch(`${this.settings.apiBaseURL}/api/v1/upload`, {
            method: 'POST',
            headers: {
                'Authorization': this.settings.token.startsWith('Bearer ') ? this.settings.token : 'Bearer ' + this.settings.token,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`${i18n.t.general.upload_failed}: ${response.status}`);
        }

        const responseData = await response.json() as LskyUploadResponse;

        if (responseData.data && responseData.data.links && responseData.data.links.url) {
            return responseData.data.links.url;
        } else if (responseData.data && responseData.data.url) {
            return responseData.data.url;
        } else if (responseData.url) {
            return responseData.url;
        } else {
            throw new Error(i18n.t.general.api_response_error);
        }
    }

    // 生成Markdown图片链接
    private generateImageMarkdown(imageUrl: string, ext: string): string {
        if (this.settings.image_width === 0) {
            return `![image.${ext}](${imageUrl})`;
        } else {
            return `![image.${ext}|${this.settings.image_width}](${imageUrl})`;
        }
    }

    // 处理文件上传和替换
    private async processFileUpload(file: File): Promise<{ newUrl: string; ext: string }> {
        const imageName = this.getFormattedImageName();

        // 直接从MIME类型获取扩展名
        const mimeToExt: { [key: string]: string } = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/tiff': 'tif',
            'image/bmp': 'bmp',
            'image/x-icon': 'ico',
            'image/vnd.adobe.photoshop': 'psd',
            'image/webp': 'webp',
        };
        const ext = mimeToExt[file.type] || 'png';

        // 创建新文件，确保文件名一致
        const fileObj = new File([file], `${imageName}.${ext}`, {type: file.type});

        const newUrl = await this.uploadToImageHost(fileObj);
        return {newUrl, ext};
    }

    // 处理本地文件
    private async processLocalFile(file: TFile, app: App): Promise<{ newUrl: string; ext: string }> {
        const imageExtensions = ['jpeg', 'jpg', 'png', 'gif', 'tif', 'bmp', 'ico', 'psd', 'webp'];
        const fileExt = file.extension.toLowerCase();

        if (!imageExtensions.includes(fileExt)) {
            throw new Error(i18n.t.general.not_image_format);
        }

        const arrayBuffer = await app.vault.readBinary(file);
        const imageName = this.getFormattedImageName();
        const mimeType = this.getMimeTypeFromExtension(fileExt);

        const blob = new Blob([arrayBuffer], {type: mimeType});
        const fileObj = new File([blob], `${imageName}.${fileExt}`, {type: mimeType});

        return this.processFileUpload(fileObj);
    }

    // 处理网络图片
    private async processNetworkImage(urlPart: string): Promise<{ newUrl: string; ext: string }> {
        // 检查黑名单
        const blackList = this.settings.newWorkBlackDomains.split(',').map(domain => domain.trim()).filter(domain => domain);
        const domain = new URL(urlPart).hostname;
        if (blackList.includes(domain)) {
            throw new Error('blacklisted');
        }

        const response = await requestUrl({
            url: urlPart,
            method: 'GET',
            throw: false
        });

        if (response.status !== 200) {
            throw new Error(`${i18n.t.errors.get_image_failed}: ${response.status}`);
        }

        const ext = this.getExtensionFromUrl(urlPart) ||
            this.getExtensionFromContentType(response.headers['content-type']) ||
            'png';
        const imageName = this.getFormattedImageName();
        const blob = new Blob([new Uint8Array(response.arrayBuffer)], {type: response.headers['content-type']});
        const fileObj = new File([blob], `${imageName}.${ext}`, {type: response.headers['content-type']});

        return this.processFileUpload(fileObj);
    }
}