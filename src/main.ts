import {
    Plugin,
    App,
    MarkdownView,
    Notice,
    Setting,
    PluginSettingTab,
    Editor,
    requestUrl
} from 'obsidian';

interface AutoImageSettings {
    apiBaseURL: string;
    token: string;
    strategy_id: number;
    newWorkBlackDomains: string;
    image_width: number;
    limit_count: number;
    is_need_delete: boolean;
}

const DEFAULT_SETTINGS: AutoImageSettings = {
    apiBaseURL: "http://example.com:port",
    token: "Bearer ...",
    strategy_id: 1,
    newWorkBlackDomains: "example.com",
    image_width: 0,
    limit_count: 0,
    is_need_delete: true,
};

export default class LskyUploader extends Plugin {
    settings: AutoImageSettings = DEFAULT_SETTINGS;
    editor?: Editor;

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async onload() {
        console.log('Manifest:', this.manifest);
        if (!this.manifest) {
            console.error('Manifest is undefined.');
            return;
        }
        await this.loadSettings();

        // 注册右键菜单
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu, editor) => {
                const selectedText = editor.getSelection();

                // 添加上传图床图片菜单项
                menu.addItem((item) => {
                    item
                        .setTitle('上传图床图片')
                        .setIcon('upload')
                        .onClick(async () => {
                            if (selectedText) {
                                await this.updateImage(selectedText, editor);
                            } else {
                                new Notice('请先选中一个有效的图像URL');
                            }
                        });
                    // 为菜单项设置特定的 data-id 属性
                    const itemEl = (item as unknown as { dom: HTMLElement }).dom;
                    if (itemEl) {
                        itemEl.dataset.id = 'my-command-upload-image';
                    }
                });

                // 添加删除图床图片菜单项
                menu.addItem((item) => {
                    item
                        .setTitle('删除图床图片')
                        .setIcon('trash')
                        .onClick(async () => {
                            if (selectedText) {
                                await this.deleteImages(selectedText, editor);
                            } else {
                                new Notice('请先选中一个有效的图像URL');
                            }
                        });
                    // 为菜单项设置特定的 data-id 属性
                    const itemEl = (item as unknown as { dom: HTMLElement }).dom;
                    if (itemEl) {
                        itemEl.dataset.id = 'my-command-delete-image';
                    }
                });
            })
        );

        // 原有的粘贴事件处理
        this.registerEvent(this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor) => {
            if (!evt.clipboardData) return;

            for (let i = 0; i < evt.clipboardData.items.length; i++) {
                let item = evt.clipboardData.items[i];

                // 检查是否为图片
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        // 阻止默认的粘贴行为
                        evt.preventDefault();

                        // 获取当前光标位置
                        const cursor = editor.getCursor();
                        // 开始上传图片
                        await this.uploadImage(file, editor, cursor);
                        break;
                    }
                }
            }
        }));

        // 原有的命令注册保持不变
        this.addCommand({
            id: 'delete-image',
            name: '删除图床图片',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView && markdownView.editor) {
                    if (!checking) {
                        const selectedText = markdownView.editor.getSelection();
                        if (selectedText) {
                            this.deleteImages(selectedText, markdownView.editor);
                        } else {
                            new Notice('请先选中一个有效的图像URL');
                        }
                    }
                    return true;
                }
                return false;
            },
        });

        this.addCommand({
            id: 'upload-image',
            name: '上传图床图片',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView && markdownView.editor) {
                    if (!checking) {
                        const selectedText = markdownView.editor.getSelection();
                        if (selectedText) {
                            this.updateImage(selectedText, markdownView.editor);
                        } else {
                            new Notice('请先选中一个有效的图像URL');
                        }
                    }
                    return true;
                }
                return false;
            },
        });

        // 原有的设置选项卡和布局变化监听保持不变
        this.addSettingTab(new AutoImageSettingTab(this.app, this));

        this.registerEvent(this.app.workspace.on('layout-change', () => {
            const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeLeaf) {
                this.editor = activeLeaf.editor;
            }
        }));
    }

    onunload() {
        new Notice('插件卸载成功');
    }

    async uploadImage(file: File, editor: Editor, insertPos: { line: number, ch: number }): Promise<void> {
        editor.replaceRange('上传中...', insertPos, insertPos);

        try {
            const imagename = this.getFormattedImageName();

            // 获取原始文件的扩展名
            const originalName = file.name;
            let ext = 'png'; // 默认值

            if (originalName && originalName.includes('.')) {
                const originalExt = originalName.split('.').pop()?.toLowerCase(); // 转换为小写进行比较
                const supportedFormats = ['jpeg', 'jpg', 'png', 'gif', 'tif', 'bmp', 'ico', 'psd', 'webp'];

                if (originalExt && supportedFormats.includes(originalExt)) {
                    ext = originalExt;
                }
            } else {
                // 如果文件名没有扩展名，从 MIME 类型推断
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
                ext = mimeToExt[file.type] || 'png';
            }

            const file1 = new File([file], `${imagename}.${ext}`, {type: file.type});
            const formData = new FormData();
            formData.append('file', file1);
            formData.append('strategy_id', this.settings.strategy_id.toString());

            // 发起上传请求
            const response = await fetch(`${this.settings.apiBaseURL}/api/v1/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': this.settings.token.startsWith('Bearer ') ? this.settings.token : 'Bearer ' + this.settings.token,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`图片上传失败: ${response.status}`);
            }

            const responseData = await response.json();
            const imageUrl = responseData.data.links.url;

            const currentLine = editor.getLine(insertPos.line);

            // 使用正确的扩展名生成 Markdown 图片链接
            let updatedLine: string;
            if (this.settings.image_width === 0) {
                updatedLine = currentLine.replace('上传中...', `![image.${ext}](${imageUrl})`);
            } else {
                updatedLine = currentLine.replace('上传中...', `![image.${ext}|${this.settings.image_width}](${imageUrl})`);
            }

            // 鼠标光标位置移动至行尾
            insertPos.ch = 6;
            editor.setCursor(insertPos);
            // 替换占位符为实际的图片链接
            editor.replaceRange(updatedLine, {line: insertPos.line, ch: 0}, {
                line: insertPos.line,
                ch: currentLine.length
            });
            // 回车新建一行
            let cursorPosition = editor.getCursor();
            editor.replaceRange('\n\n', cursorPosition);
            // 光标移动至新行
            insertPos.line += 2;
            insertPos.ch = 0;
            editor.setCursor(insertPos);

        } catch (error) {
            new Notice(`图片上传失败: ${(error as Error).message}`);
            editor.replaceRange('', insertPos, {line: insertPos.line, ch: insertPos.ch + 12});
        }
    }

    async deleteImages(selectedText: string, editor: Editor) {
        try {
            const urlRegex = /\bhttps?:\/\/[^\s)]+\.(jpeg|jpg|png|gif|tif|bmp|ico|psd|webp)/g;
            const imageUrls = selectedText.match(urlRegex)?.map(match => match.trim()) || [];

            if (imageUrls.length === 0) {
                new Notice("没有找到图片链接");
                return;
            }

            let updatedSelection = selectedText;
            let errors: string[] = [];
            let successCount = 0; // 初始化成功删除的计数器
            let skippedCount = 0; // 初始化跳过的计数器

            const headers = {
                'Accept': 'application/json',
                'Authorization': this.settings.token.startsWith('Bearer ') ? this.settings.token : 'Bearer ' + this.settings.token,
            };

            for (let i = 0; i < imageUrls.length; i++) {
                const imageUrl = imageUrls[i];

                // 检查是否超过 limit_count
                if (this.settings.limit_count > 0 && i >= this.settings.limit_count) {
                    skippedCount++;
                    continue; // 跳过后续图片
                }

                const name = imageUrl.split("/").pop();
                if (!name) {
                    errors.push(`无效的图片链接: ${imageUrl}`);
                    continue;
                }

                const keyword = name.split("-")[0];
                const requestUrlString = `${this.settings.apiBaseURL}/api/v1/images?keyword=${keyword}`;
                const response = await requestUrl({
                    url: requestUrlString,
                    method: 'GET',
                    headers: headers,
                    throw: false
                });

                if (response.status !== 200) {
                    errors.push(`获取图片失败: ${response.status}`);
                    continue;
                }

                const list = response.json.data.data;
                let found = false;
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
                                found = true;
                                updatedSelection = updatedSelection.replace(imageUrl, '');
                                successCount++; // 成功删除图片后增加计数器
                            } else {
                                errors.push(`图片删除失败: ${deleteResponse.status}`);
                            }
                        }
                    }
                }
                if (!found) {
                    errors.push(`未找到对应的图片: ${imageUrl}`);
                }
            }
            editor.replaceSelection(updatedSelection);

            if (errors.length > 0) {
                new Notice(`删除失败: \n${errors.join('\n')}`);
            }
            if (successCount > 0) {
                new Notice(`成功删除了 ${successCount} 张图片`);
            }
            if (skippedCount > 0) {
                new Notice(`选中删除图片数量超过 ${this.settings.limit_count} 张,跳过了 ${skippedCount} 张`);
            } else if (errors.length === 0 && successCount === 0) {
                new Notice('没有图片被删除');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`错误: ${errorMessage}`);
        }
    }

    async updateImage(selectedText: string, editor: Editor) {
        // 修改正则表达式，匹配三种格式：
        // 1. 标准Markdown图片: [alt](url)
        // 2. 内部链接: ![[filename]]
        const urlRegex = /(!\[[^\]]*\]\()([^)]+)(\))|(!\[\[([^\]]+)]])/gi;

        let match;
        let processedText = selectedText;
        let successCount = 0;
        let blacklistedCount = 0;
        let skippedCount = 0;
        let errors: string[] = [];
        let processedUrls = 0;

        // 使用循环处理所有匹配的图片链接
        while ((match = urlRegex.exec(selectedText)) !== null) {
            // 检查是否超过 limit_count
            if (this.settings.limit_count > 0 && processedUrls >= this.settings.limit_count) {
                skippedCount++;
                continue;
            }

            processedUrls++;

            try {
                let fullMatch = match[0];
                let isInternalLink = match[4] !== undefined; // ![[filename]] 格式
                let urlPart = isInternalLink ? match[5] : match[2]; // 内部链接或普通URL

                if (isInternalLink) {
                    // 处理内部链接 ![[filename]]
                    const fileName = urlPart;

                    // 在vault中查找文件
                    const file = this.app.vault.getFiles().find(f =>
                        f.name === fileName || f.basename === fileName.replace(/\.[^/.]+$/, "")
                    );

                    if (!file) {
                        errors.push(`找不到内部文件: ${fileName}`);
                        continue;
                    }

                    // 检查文件类型是否为图片
                    const imageExtensions = ['jpeg', 'jpg', 'png', 'gif', 'tif', 'bmp', 'ico', 'psd', 'webp'];
                    const fileExt = file.extension.toLowerCase();
                    if (!imageExtensions.includes(fileExt)) {
                        errors.push(`文件不是图片格式: ${fileName}`);
                        continue;
                    }

                    // 读取文件内容
                    const arrayBuffer = await this.app.vault.readBinary(file);
                    const imagename = this.getFormattedImageName();
                    const mimeType = this.getMimeTypeFromExtension(fileExt);

                    const blob = new Blob([arrayBuffer], {type: mimeType});
                    const fileObj = new File([blob], `${imagename}.${fileExt}`, {type: mimeType});
                    const formData = new FormData();

                    formData.append('file', fileObj);
                    formData.append('strategy_id', this.settings.strategy_id.toString());

                    const uploadResponse = await fetch(`${this.settings.apiBaseURL}/api/v1/upload`, {
                        method: 'POST',
                        headers: {
                            'Authorization': this.settings.token.startsWith('Bearer ') ? this.settings.token : 'Bearer ' + this.settings.token,
                        },
                        body: formData
                    });

                    if (!uploadResponse.ok) {
                        errors.push(`图片上传失败: ${uploadResponse.status} - ${fileName}`);
                        continue;
                    }

                    const responseData = await uploadResponse.json();

                    // 修复这里：检查响应数据结构
                    let newUrl: string;
                    if (responseData.data && responseData.data.links && responseData.data.links.url) {
                        newUrl = responseData.data.links.url;
                    } else if (responseData.data && responseData.data.url) {
                        newUrl = responseData.data.url;
                    } else if (responseData.url) {
                        newUrl = responseData.url;
                    } else {
                        errors.push(`API响应格式不正确: ${JSON.stringify(responseData)}`);
                        continue;
                    }

                    // 将内部链接转换为标准Markdown图片格式
                    const replacement = this.settings.image_width === 0
                        ? `![image.${fileExt}](${newUrl})`
                        : `![image.${fileExt}|${this.settings.image_width}](${newUrl})`;

                    processedText = processedText.replace(fullMatch, replacement);
                    successCount++;

                    // ---------- 关键修改：检查并删除源文件 ----------
                    if (this.settings.is_need_delete) {
                        try {
                            await this.app.vault.trash(file, false); // 删除文件，不放入回收站
                            console.log(`已删除内部图片: ${fileName}`);
                        } catch (error) {
                            errors.push(`删除内部图片失败: ${(error as Error).message}`);
                        }
                    }
                    // ------------------------------------------------

                } else {
                    // 处理普通URL图片 [alt](url)
                    // 检查是否是网络URL
                    if (urlPart.startsWith('http://') || urlPart.startsWith('https://')) {
                        // 网络图片处理逻辑
                        const blackList = this.settings.newWorkBlackDomains.split(',').map(domain => domain.trim()).filter(domain => domain);
                        let domain = '';
                        try {
                            domain = new URL(urlPart).hostname;
                            if (blackList.includes(domain)) {
                                blacklistedCount++;
                                continue;
                            }
                        } catch {
                            // URL解析失败，跳过
                            errors.push(`无效的URL: ${urlPart}`);
                            continue;
                        }

                        const response = await requestUrl({
                            url: urlPart,
                            method: 'GET',
                            throw: false
                        });

                        if (response.status !== 200) {
                            errors.push(`获取图片失败: ${response.status} - ${urlPart}`);
                            continue;
                        }

                        const ext = this.getExtensionFromUrl(urlPart) || this.getExtensionFromContentType(response.headers['content-type']) || 'png';
                        const imagename = this.getFormattedImageName();
                        const blob = new Blob([new Uint8Array(response.arrayBuffer)], {type: response.headers['content-type']});
                        const fileObj = new File([blob], `${imagename}.${ext}`, {type: response.headers['content-type']});
                        const formData = new FormData();

                        formData.append('file', fileObj);
                        formData.append('strategy_id', this.settings.strategy_id.toString());

                        const uploadResponse = await fetch(`${this.settings.apiBaseURL}/api/v1/upload`, {
                            method: 'POST',
                            headers: {
                                'Authorization': this.settings.token.startsWith('Bearer ') ? this.settings.token : 'Bearer ' + this.settings.token,
                            },
                            body: formData
                        });

                        if (!uploadResponse.ok) {
                            errors.push(`图片上传失败: ${uploadResponse.status} - ${urlPart}`);
                            continue;
                        }

                        const responseData = await uploadResponse.json();

                        // 修复这里：检查响应数据结构
                        let newUrl: string;
                        if (responseData.data && responseData.data.links && responseData.data.links.url) {
                            newUrl = responseData.data.links.url;
                        } else if (responseData.data && responseData.data.url) {
                            newUrl = responseData.data.url;
                        } else if (responseData.url) {
                            newUrl = responseData.url;
                        } else {
                            errors.push(`API响应格式不正确: ${JSON.stringify(responseData)}`);
                            continue;
                        }

                        const replacement = this.settings.image_width === 0
                            ? `![image.${ext}](${newUrl})`
                            : `![image.${ext}|${this.settings.image_width}](${newUrl})`;

                        processedText = processedText.replace(fullMatch, replacement);
                        successCount++;

                    } else {
                        // 处理本地相对路径文件
                        const filePath = decodeURIComponent(urlPart);
                        const file = this.app.vault.getFiles().find(f => f.path === filePath);

                        if (!file) {
                            errors.push(`找不到本地文件: ${filePath}`);
                            continue;
                        }

                        const imageExtensions = ['jpeg', 'jpg', 'png', 'gif', 'tif', 'bmp', 'ico', 'psd', 'webp'];
                        const fileExt = file.extension.toLowerCase();
                        if (!imageExtensions.includes(fileExt)) {
                            errors.push(`文件不是图片格式: ${filePath}`);
                            continue;
                        }

                        const arrayBuffer = await this.app.vault.readBinary(file);
                        const imagename = this.getFormattedImageName();
                        const mimeType = this.getMimeTypeFromExtension(fileExt);

                        const blob = new Blob([arrayBuffer], {type: mimeType});
                        const fileObj = new File([blob], `${imagename}.${fileExt}`, {type: mimeType});
                        const formData = new FormData();

                        formData.append('file', fileObj);
                        formData.append('strategy_id', this.settings.strategy_id.toString());

                        const uploadResponse = await fetch(`${this.settings.apiBaseURL}/api/v1/upload`, {
                            method: 'POST',
                            headers: {
                                'Authorization': this.settings.token.startsWith('Bearer ') ? this.settings.token : 'Bearer ' + this.settings.token,
                            },
                            body: formData
                        });

                        if (!uploadResponse.ok) {
                            errors.push(`图片上传失败: ${uploadResponse.status} - ${filePath}`);
                            continue;
                        }

                        const responseData = await uploadResponse.json();

                        // 修复这里：检查响应数据结构
                        let newUrl: string;
                        if (responseData.data && responseData.data.links && responseData.data.links.url) {
                            newUrl = responseData.data.links.url;
                        } else if (responseData.data && responseData.data.url) {
                            newUrl = responseData.data.url;
                        } else if (responseData.url) {
                            newUrl = responseData.url;
                        } else {
                            errors.push(`API响应格式不正确: ${JSON.stringify(responseData)}`);
                            continue;
                        }

                        // 替换URL部分
                        let replacement: string;
                        if (this.settings.image_width === 0) {
                            replacement = `![image.${fileExt}](${newUrl})`;
                        } else {
                            replacement = `![image.${fileExt}|${this.settings.image_width}](${newUrl})`;
                        }
                        processedText = processedText.replace(fullMatch, replacement);
                        successCount++;

                        // ---------- 关键修改：检查并删除源文件 ----------
                        if (this.settings.is_need_delete) {
                            try {
                                await this.app.vault.trash(file, false); // 删除文件，不放入回收站
                                console.log(`已删除本地图片: ${filePath}`);
                            } catch (error) {
                                errors.push(`删除本地图片失败: ${(error as Error).message}`);
                            }
                        }
                        // ------------------------------------------------
                    }
                }

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                errors.push(`错误: ${errorMessage}`);
            }
        }

        // 替换编辑器中的选中文本
        if (processedText !== selectedText) {
            editor.replaceSelection(processedText);
        }

        // 显示结果通知
        if (errors.length > 0) {
            new Notice(`存在错误: \n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`);
        }

        if (blacklistedCount > 0) {
            new Notice(`跳过黑名单域名图片 ${blacklistedCount} 张`);
        }

        if (skippedCount > 0) {
            new Notice(`选中上传图片数量超过 ${this.settings.limit_count} 张,跳过 ${skippedCount} 张`);
        }

        if (successCount > 0) {
            new Notice(`成功上传 ${successCount} 张图片`);
        } else if (errors.length === 0 && blacklistedCount === 0 && skippedCount === 0) {
            new Notice('没有找到可上传的图片');
        }
    }

    // 辅助函数：生成格式化的图片名称
    getFormattedImageName(): string {
        const now = new Date();
        const Y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0'); // 月份从0开始，所以需要加1
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const i = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');
        return `${Y}${m}${d}${h}${i}${s}${ms}`;
    }

    // 添加辅助方法：从URL获取文件扩展名
    getExtensionFromUrl(url: string): string | null {
        const match = url.match(/\.(jpeg|jpg|png|gif|tif|bmp|ico|psd|webp)/i);
        return match ? match[1].toLowerCase() : null;
    }

    // 添加辅助方法：从Content-Type获取文件扩展名
    getExtensionFromContentType(contentType: string): string | null {
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

    // 添加辅助方法：根据文件扩展名获取MIME类型
    getMimeTypeFromExtension(ext: string): string {
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
}

// 设置界面类
class AutoImageSettingTab extends PluginSettingTab {
    plugin: LskyUploader; // 这里正确定义了 plugin 属性

    constructor(app: App, plugin: LskyUploader) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();
        containerEl.createEl('h2', {text: 'AutoImage 设置'});

        new Setting(containerEl)
            .setName('API地址')
            .setDesc('兰空图床API的地址')
            .addText(text => text
                .setPlaceholder('http://example.com:port')
                .setValue(this.plugin.settings.apiBaseURL)
                .onChange(async (value) => {
                    this.plugin.settings.apiBaseURL = value.trim().replace(/\/+$/, "");
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Bearer Token')
            .setDesc('兰空图床API的Bearer Token')
            .addText(text => text
                .setPlaceholder('Bearer ...')
                .setValue(this.plugin.settings.token)
                .onChange(async (value) => {
                    this.plugin.settings.token = value.trim();
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('策略ID')
            .setDesc('兰空图床API的策略ID，用于上传图片。')
            .addText(text => {
                const inputEl = text.inputEl;
                inputEl.type = 'number';
                inputEl.min = '0';
                inputEl.step = '1';
                text.setPlaceholder('0')
                    .setValue(this.plugin.settings.strategy_id.toString())
                    .onChange(async (value) => {
                        const intValue = parseInt(value.trim(), 10);
                        if (!isNaN(intValue)) { // 检查是否为有效的整数
                            this.plugin.settings.strategy_id = intValue;
                            await this.plugin.saveSettings();
                        } else {
                            new Notice('请输入有效的整数');
                        }
                    });
            });

        new Setting(containerEl)
            .setName("域名黑名单")
            .setDesc("使用逗号分隔的域名列表，上传到这些域名的图片将被跳过。例如：example.com,test.org")
            .addTextArea(textArea => textArea
                .setValue(this.plugin.settings.newWorkBlackDomains)
                .onChange(async (value) => {
                    this.plugin.settings.newWorkBlackDomains = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('图片宽度')
            .setDesc('输入图片的宽度，单位为像素，默认为0，表示使用原始图片大小。')
            .addText(text => {
                const inputEl = text.inputEl;
                inputEl.type = 'number';
                inputEl.min = '0';
                inputEl.step = '1';
                text.setPlaceholder('0')
                    .setValue(this.plugin.settings.image_width.toString())
                    .onChange(async (value) => {
                        const intValue = parseInt(value.trim(), 10);
                        if (!isNaN(intValue)) { // 检查是否为有效的整数
                            this.plugin.settings.image_width = intValue;
                            await this.plugin.saveSettings();
                        } else {
                            new Notice('请输入有效的整数');
                        }
                    });
            });

        new Setting(containerEl)
            .setName('最大上传和删除图片数量')
            .setDesc('输入最大上传和删除图片数量，超过数量的图片将被跳过,建议设置小于等于50。')
            .addText(text => {
                const inputEl = text.inputEl;
                inputEl.type = 'number';
                inputEl.min = '0';
                inputEl.step = '1';
                text.setPlaceholder('0')
                    .setValue(this.plugin.settings.limit_count.toString())
                    .onChange(async (value) => {
                        const intValue = parseInt(value.trim(), 10);
                        if (!isNaN(intValue)) { // 检查是否为有效的整数
                            this.plugin.settings.limit_count = intValue;
                            await this.plugin.saveSettings();
                        } else {
                            new Notice('请输入有效的整数');
                        }
                    });
            });
        // 在这里添加新的设置项 - 复选框
        new Setting(containerEl)
            .setName('上传成功后删除本地图片')
            .setDesc('如果勾选，则在上传成功后删除本地图片。')
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.is_need_delete || false)
                    .onChange(async (value) => {
                        this.plugin.settings.is_need_delete = value;
                        await this.plugin.saveSettings();
                    });
            });
    }
}
