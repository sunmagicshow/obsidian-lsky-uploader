import {getLanguage} from 'obsidian';

interface SettingItem {
    name: string;
    desc: string;
    placeholder?: string;
}

export interface LangPack {
    // 通用
    general: {
        plugin_unloaded: string;
        no_selection: string;
        uploading: string;
        upload_failed: string;
        delete_failed: string;
        download_failed: string;
        no_images_found: string;
        invalid_url: string;
        file_not_found: string;
        not_image_format: string;
        api_response_error: string;
        network_error: string;
        invalid_number: string;
    };

    // 菜单和命令
    commands: {
        upload_image: string;
        delete_image: string;
        download_image: string;
    };

    // 操作结果
    results: {
        success_upload_count: string;
        success_delete_count: string;
        success_download_count: string;
        blacklisted_skipped: string;
        limit_skipped: string;
        no_images_processed: string;
        no_images_deleted: string;
        no_images_downloaded: string;
    };

    // 错误信息
    errors: {
        errors_occurred: string;
        delete_errors: string;
        download_errors: string;
        get_image_failed: string;
        image_not_found: string;
        image_delete_failed: string;
        image_download_failed: string;
        invalid_image_url: string;
        download_path_not_set: string;
    };

    // 设置界面 - 修改为 SettingItem 类型
    settings: {
        api_url: SettingItem;
        bearer_token: SettingItem;
        strategy_id: SettingItem;
        domain_blacklist: SettingItem;
        image_width: SettingItem;
        limit_count: SettingItem;
        delete_after_upload: SettingItem;
        upload_clipboard: SettingItem;
        show_upload_button: SettingItem;
        show_delete_button: SettingItem;
        show_download_button: SettingItem;
        default_download_path: SettingItem;
    };

    // 占位符
    placeholders: {
        api_url: string;
        bearer_token: string;
        number: string;
        download_path: string;
    };
}

// 中文语言包
const zh: LangPack = {
    general: {
        plugin_unloaded: '插件卸载成功',
        no_selection: '请先选中一个有效的图像URL',
        uploading: '上传中...',
        upload_failed: '图片上传失败',
        delete_failed: '图片删除失败',
        download_failed: '图片下载失败',
        no_images_found: '没有找到图片链接',
        invalid_url: '无效的URL',
        file_not_found: '找不到文件',
        not_image_format: '文件不是图片格式',
        api_response_error: 'API响应格式不正确',
        network_error: '网络错误',
        invalid_number: '请输入有效的数字',
    },
    commands: {
        upload_image: '上传图床图片',
        delete_image: '删除图床图片',
        download_image: '下载图床图片',
    },
    results: {
        success_upload_count: '成功上传 {count} 张图片',
        success_delete_count: '成功删除了 {count} 张图片',
        success_download_count: '成功下载 {count} 张图片',
        blacklisted_skipped: '跳过黑名单域名图片 {count} 张',
        limit_skipped: '选中{action}图片数量超过 {limit} 张,{skipped} {count} 张',
        no_images_processed: '没有找到可上传的图片',
        no_images_deleted: '没有图片被删除',
        no_images_downloaded: '没有图片被下载',
    },
    errors: {
        errors_occurred: '存在错误',
        delete_errors: '删除失败',
        download_errors: '下载失败',
        get_image_failed: '获取图片失败',
        image_not_found: '未找到对应的图片',
        image_delete_failed: '图片删除失败',
        image_download_failed: '图片下载失败',
        invalid_image_url: '无效的图片链接',
        download_path_not_set: '下载路径未设置',
    },
    settings: {
        api_url: {
            name: 'API地址',
            desc: '兰空图床API的地址',
            placeholder: 'http://example.com:port'
        },
        bearer_token: {
            name: 'Bearer Token',
            desc: '兰空图床API的Bearer Token',
            placeholder: 'Bearer ...'
        },
        strategy_id: {
            name: '策略ID',
            desc: '兰空图床API的策略ID，用于上传图片。'
        },
        domain_blacklist: {
            name: '域名黑名单',
            desc: '使用逗号分隔的域名列表，上传到这些域名的图片将被跳过。例如：example.com,test.org'
        },
        image_width: {
            name: '图片宽度',
            desc: '输入图片的宽度，默认为0，表示使用原始图片大小。',
            placeholder: '0'
        },
        limit_count: {
            name: '最大上传和删除图片数量',
            desc: '输入最大上传和删除图片数量，超过数量的图片将被跳过,建议设置小于等于50。',
            placeholder: '0'
        },
        delete_after_upload: {
            name: '上传成功后移除本地图片',
            desc: '如果勾选，则在上传成功后移除本地图片。'
        },
        upload_clipboard: {
            name: '自动上传剪贴板图片',
            desc: '启用后，粘贴图片到文档时，自动上传到图床。'
        },
        show_upload_button: {
            name: '显示上传按钮命令',
            desc: '是否在界面中显示上传按钮命令'
        },
        show_delete_button: {
            name: '显示删除按钮命令',
            desc: '是否在界面中显示删除按钮命令'
        },
        show_download_button: {
            name: '显示下载按钮命令',
            desc: '是否在界面中显示下载按钮命令'
        },
        default_download_path: {
            name: '默认图片下载路径',
            desc: '图片下载的默认存储路径，例如：/root',
            placeholder: '输入下载路径'
        }
    },
    placeholders: {
        api_url: 'http://example.com:port',
        bearer_token: 'Bearer ...',
        number: '0',
        download_path: '输入下载路径'
    }
};

// 英文语言包
const en: LangPack = {
    general: {
        plugin_unloaded: 'Plugin unloaded successfully',
        no_selection: 'Please select a valid image URL first',
        uploading: 'Uploading...',
        upload_failed: 'Image upload failed',
        delete_failed: 'Image deletion failed',
        download_failed: 'Image download failed',
        no_images_found: 'No image links found',
        invalid_url: 'Invalid URL',
        file_not_found: 'File not found',
        not_image_format: 'File is not an image format',
        api_response_error: 'API response format is incorrect',
        network_error: 'Network error',
        invalid_number: 'Please enter a valid number',
    },
    commands: {
        upload_image: 'Upload to image host',
        delete_image: 'Delete from image host',
        download_image: 'Download to local storage',
    },
    results: {
        success_upload_count: 'Successfully uploaded {count} images',
        success_delete_count: 'Successfully deleted {count} images',
        success_download_count: 'Successfully downloaded {count} images',
        blacklisted_skipped: 'Skipped {count} blacklisted domain images',
        limit_skipped: 'Selected {action} image count exceeds {limit}, skipped {count} images',
        no_images_processed: 'No images found to upload',
        no_images_deleted: 'No images were deleted',
        no_images_downloaded: 'No images were downloaded',
    },
    errors: {
        errors_occurred: 'Errors occurred',
        delete_errors: 'Deletion failed',
        download_errors: 'Download failed',
        get_image_failed: 'Failed to get image',
        image_not_found: 'Corresponding image not found',
        image_delete_failed: 'Image deletion failed',
        image_download_failed: 'Image download failed',
        invalid_image_url: 'Invalid image link',
        download_path_not_set: 'Download path not set',
    },
    settings: {
        api_url: {
            name: 'API URL',
            desc: 'Lsky Pro image hosting API URL',
            placeholder: 'http://example.com:port'
        },
        bearer_token: {
            name: 'Bearer Token',
            desc: 'Bearer Token for Lsky Pro API',
            placeholder: 'Bearer ...'
        },
        strategy_id: {
            name: 'Strategy ID',
            desc: 'Lsky Pro API strategy ID for uploading images'
        },
        domain_blacklist: {
            name: 'Domain Blacklist',
            desc: 'Comma-separated list of domains, images from these domains will be skipped. Example: example.com,test.org'
        },
        image_width: {
            name: 'Image Width',
            desc: 'Enter image width in pixels, default 0 means using original image size',
            placeholder: '0'
        },
        limit_count: {
            name: 'Maximum upload and delete image count',
            desc: 'Enter maximum upload and delete image count, images beyond this count will be skipped, recommended to set less than or equal to 50',
            placeholder: '0'
        },
        delete_after_upload: {
            name: 'remove local image after successful upload',
            desc: 'If checked, local images will be removed after successful upload'
        },
        upload_clipboard: {
            name: 'Upload clipboard image automatically',
            desc: 'If checked, clipboard images will be uploaded directly to image host'
        },
        show_upload_button: {
            name: 'Show upload button command',
            desc: 'Whether to show the upload button command in the interface'
        },
        show_delete_button: {
            name: 'Show delete button command',
            desc: 'Whether to show the delete button command in the interface'
        },
        show_download_button: {
            name: 'Show download button command',
            desc: 'Whether to show the download button command in the interface'
        },
        default_download_path: {
            name: 'Default image download path',
            desc: 'Default storage path for downloaded images, e.g., /root',
            placeholder: 'Enter download path'
        }
    },
    placeholders: {
        api_url: 'http://example.com:port',
        bearer_token: 'Bearer ...',
        number: '0',
        download_path: '输入下载路径'
    }
};

// 定义语言类型
type Locale = 'zh' | 'en';

// 语言包映射
const locales: Record<Locale, LangPack> = {zh, en};

// 获取系统语言
function getSystemLocale(): Locale {
    const language = getLanguage();
    return language.startsWith('zh') ? 'zh' : 'en';
}

// 获取当前语言包
function getCurrentLocaleTexts(): LangPack {
    return locales[getSystemLocale()];
}

export class I18nService {
    // 当前语言包实例
    public t: LangPack;

    constructor() {
        // 初始化时根据系统语言设置
        this.t = getCurrentLocaleTexts();
    }

    // 带参数替换的方法
    tf(text: string, params?: Record<string, string | number>): string {
        let result = text;
        if (params) {
            Object.entries(params).forEach(([paramKey, value]) => {
                result = result.replace(`{${paramKey}}`, String(value));
            });
        }
        return result;
    }

    // 便捷方法 - 保持原有 API 兼容性
    getNoSelectionText(): string {
        return this.t.general.no_selection;
    }

    getSuccessUploadText(count: number): string {
        return this.tf(this.t.results.success_upload_count, {count});
    }

    getSuccessDeleteText(count: number): string {
        return this.tf(this.t.results.success_delete_count, {count});
    }

    getSuccessDownloadText(count: number): string {
        return this.tf(this.t.results.success_download_count, {count});
    }

    getBlacklistedSkippedText(count: number): string {
        return this.tf(this.t.results.blacklisted_skipped, {count});
    }

    getLimitSkippedText(action: string, limit: number, count: number): string {
        const actionText = action === 'upload' ? '上传' : action === 'delete' ? '删除' : '下载';
        const skippedText = action === 'upload' ? '跳过' : action === 'delete' ? '跳过了' : '跳过了';
        return this.tf(this.t.results.limit_skipped, {action: actionText, limit, count, skipped: skippedText});
    }

    getDownloadPathNotSetText(): string {
        return this.t.errors.download_path_not_set;
    }
}

// 创建单例实例
export const i18n = new I18nService();