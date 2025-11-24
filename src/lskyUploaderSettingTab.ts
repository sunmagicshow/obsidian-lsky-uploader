import {App, PluginSettingTab, Setting, Notice} from 'obsidian';
import LskyUploader from './main';
import {i18n} from './i18n';

export class LskyUploaderSettingTab extends PluginSettingTab {
    plugin: LskyUploader;

    constructor(app: App, plugin: LskyUploader) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();
        containerEl.addClass('lsky-uploader-settings');
        // API地址设置
        new Setting(containerEl)
            .setName(i18n.t.settings.api_url.name)
            .setDesc(i18n.t.settings.api_url.desc)
            .addText(text => text
                .setPlaceholder(i18n.t.settings.api_url.placeholder || i18n.t.placeholders.api_url)
                .setValue(this.plugin.settings.apiBaseURL)
                .onChange(async (value) => {
                    this.plugin.settings.apiBaseURL = value.trim().replace(/\/+$/, "");
                    await this.plugin.saveData(this.plugin.settings);
                })
            );

        // Bearer Token设置
        new Setting(containerEl)
            .setName(i18n.t.settings.bearer_token.name)
            .setDesc(i18n.t.settings.bearer_token.desc)
            .addText(text => text
                .setPlaceholder(i18n.t.settings.bearer_token.placeholder || i18n.t.placeholders.bearer_token)
                .setValue(this.plugin.settings.token)
                .onChange(async (value) => {
                    this.plugin.settings.token = value.trim();
                    await this.plugin.saveData(this.plugin.settings);
                })
            );

        // 策略ID设置
        new Setting(containerEl)
            .setName(i18n.t.settings.strategy_id.name)
            .setDesc(i18n.t.settings.strategy_id.desc)
            .addText(text => {
                const inputEl = text.inputEl;
                inputEl.type = 'number';
                inputEl.min = '0';
                inputEl.step = '1';
                text.setPlaceholder(i18n.t.placeholders.number)
                    .setValue(this.plugin.settings.strategy_id.toString())
                    .onChange(async (value) => {
                        const intValue = parseInt(value.trim(), 10);
                        if (!isNaN(intValue)) {
                            this.plugin.settings.strategy_id = intValue;
                            await this.plugin.saveData(this.plugin.settings);
                        } else {
                            new Notice(i18n.t.general.invalid_number);
                        }
                    });
            });

        // 域名黑名单设置
        new Setting(containerEl)
            .setName(i18n.t.settings.domain_blacklist.name)
            .setDesc(i18n.t.settings.domain_blacklist.desc)
            .addTextArea(textArea => textArea
                .setValue(this.plugin.settings.newWorkBlackDomains)
                .onChange(async (value) => {
                    this.plugin.settings.newWorkBlackDomains = value;
                    await this.plugin.saveData(this.plugin.settings);
                }));

        // 图片宽度设置
        new Setting(containerEl)
            .setName(i18n.t.settings.image_width.name)
            .setDesc(i18n.t.settings.image_width.desc)
            .addText(text => {
                const inputEl = text.inputEl;
                inputEl.type = 'number';
                inputEl.min = '0';
                inputEl.step = '1';
                text.setPlaceholder(i18n.t.settings.image_width.placeholder || i18n.t.placeholders.number)
                    .setValue(this.plugin.settings.image_width.toString())
                    .onChange(async (value) => {
                        const intValue = parseInt(value.trim(), 10);
                        if (!isNaN(intValue)) {
                            this.plugin.settings.image_width = intValue;
                            await this.plugin.saveData(this.plugin.settings);
                        } else {
                            new Notice(i18n.t.general.invalid_number);
                        }
                    });
            });

        // 最大图片数量限制设置
        new Setting(containerEl)
            .setName(i18n.t.settings.limit_count.name)
            .setDesc(i18n.t.settings.limit_count.desc)
            .addText(text => {
                const inputEl = text.inputEl;
                inputEl.type = 'number';
                inputEl.min = '0';
                inputEl.step = '1';
                text.setPlaceholder(i18n.t.settings.limit_count.placeholder || i18n.t.placeholders.number)
                    .setValue(this.plugin.settings.limit_count.toString())
                    .onChange(async (value) => {
                        const intValue = parseInt(value.trim(), 10);
                        if (!isNaN(intValue)) {
                            this.plugin.settings.limit_count = intValue;
                            await this.plugin.saveData(this.plugin.settings);
                        } else {
                            new Notice(i18n.t.general.invalid_number);
                        }
                    });
            });

        // 自动上传剪贴板图片设置
        new Setting(containerEl)
            .setName(i18n.t.settings.upload_clipboard.name)
            .setDesc(i18n.t.settings.upload_clipboard.desc)
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.is_upload_clipboard || false)
                    .onChange(async (value) => {
                        this.plugin.settings.is_upload_clipboard = value;
                        await this.plugin.saveData(this.plugin.settings);
                    });
            });

        // 显示上传按钮设置
        new Setting(containerEl)
            .setName(i18n.t.settings.show_upload_button.name)
            .setDesc(i18n.t.settings.show_upload_button.desc)
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.showUploadButton || false)
                    .onChange(async (value) => {
                        this.plugin.settings.showUploadButton = value;
                        await this.plugin.saveData(this.plugin.settings);
                    });
            });

        // 上传后删除本地图片设置
        new Setting(containerEl)
            .setName(i18n.t.settings.delete_after_upload.name)
            .setDesc(i18n.t.settings.delete_after_upload.desc)
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.is_need_delete || false)
                    .onChange(async (value) => {
                        this.plugin.settings.is_need_delete = value;
                        await this.plugin.saveData(this.plugin.settings);
                    });
            });

        // 显示删除按钮设置
        new Setting(containerEl)
            .setName(i18n.t.settings.show_delete_button.name)
            .setDesc(i18n.t.settings.show_delete_button.desc)
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.showDeleteButton || false)
                    .onChange(async (value) => {
                        this.plugin.settings.showDeleteButton = value;
                        await this.plugin.saveData(this.plugin.settings);
                    });
            });

        // 显示下载按钮设置
        new Setting(containerEl)
            .setName(i18n.t.settings.show_download_button.name)
            .setDesc(i18n.t.settings.show_download_button.desc)
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.showDownloadButton || false)
                    .onChange(async (value) => {
                        this.plugin.settings.showDownloadButton = value;
                        await this.plugin.saveData(this.plugin.settings);
                    });
            });

        // 默认下载路径设置
        new Setting(containerEl)
            .setName(i18n.t.settings.default_download_path.name)
            .setDesc(i18n.t.settings.default_download_path.desc)
            .addText(text => text
                .setPlaceholder(i18n.t.settings.default_download_path.placeholder || i18n.t.placeholders.download_path)
                .setValue(this.plugin.settings.defaultDownloadPath || '')
                .onChange(async (value) => {
                    this.plugin.settings.defaultDownloadPath = value.trim();
                    await this.plugin.saveData(this.plugin.settings);
                })
            );
    }
}