import {Plugin, MarkdownView, Notice, Editor,} from 'obsidian';
import {AutoImageSettings, DEFAULT_SETTINGS} from './types';
import {LskyUploaderView} from './lskyUploaderView';
import {LskyUploaderSettingTab} from './lskyUploaderSettingTab';
import {i18n} from './i18n';

export default class LskyUploader extends Plugin {
    settings: AutoImageSettings = DEFAULT_SETTINGS;
    editor?: Editor;
    uploaderView!: LskyUploaderView;

    // 命令配置
    private readonly commandConfigs = [
        {
            id: 'upload-image',
            key: 'showUploadButton',
            title: () => i18n.t.commands.upload_image,
            icon: 'upload',
            action: (selectedText: string, editor: Editor) =>
                this.uploaderView.uploadImage(selectedText, editor, this.app),
            errorKey: 'upload_failed'
        },
        {
            id: 'delete-image',
            key: 'showDeleteButton',
            title: () => i18n.t.commands.delete_image,
            icon: 'trash',
            action: (selectedText: string, editor: Editor) =>
                this.uploaderView.deleteImages(selectedText, editor),
            errorKey: 'delete_failed'
        },
        {
            id: 'download-image',
            key: 'showDownloadButton',
            title: () => i18n.t.commands.download_image,
            icon: 'download',
            action: (selectedText: string) =>
                this.uploaderView.downloadImages(selectedText, this.app),
            errorKey: 'download_failed'
        }
    ];

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.uploaderView = new LskyUploaderView(this.settings);
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.uploaderView = new LskyUploaderView(this.settings);
        this.updateCommands();
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
                this.registerContextMenuItems(menu, selectedText, editor);
            })
        );

        // 粘贴事件处理
        this.registerEvent(this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor) => {
            await this.handlePasteEvent(evt, editor);
        }));

        // 注册命令
        this.registerCommands();

        // 设置选项卡和布局变化监听
        this.addSettingTab(new LskyUploaderSettingTab(this.app, this));

        this.registerEvent(this.app.workspace.on('layout-change', () => {
            const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeLeaf) {
                this.editor = activeLeaf.editor;
            }
        }));
    }

    onunload() {
        new Notice(i18n.t.general.plugin_unloaded);
    }

    // 注册右键菜单项
    private registerContextMenuItems(menu: any, selectedText: string, editor: Editor) {
        this.commandConfigs.forEach(config => {
            if (this.settings[config.key as keyof AutoImageSettings]) {
                menu.addItem((item: any) => {
                    item
                        .setTitle(config.title())
                        .setIcon(config.icon)
                        .onClick(async () => {
                            if (selectedText) {
                                await this.executeAction(config, selectedText, editor);
                            } else {
                                new Notice(i18n.getNoSelectionText());
                            }
                        });

                    const itemEl = (item as unknown as { dom: HTMLElement }).dom;
                    if (itemEl) {
                        itemEl.dataset.id = `my-command-${config.id}`;
                    }
                });
            }
        });
    }

    // 处理粘贴事件
    private async handlePasteEvent(evt: ClipboardEvent, editor: Editor) {
        if (!evt.clipboardData || !this.settings.is_upload_clipboard) return;

        for (let i = 0; i < evt.clipboardData.items.length; i++) {
            const item = evt.clipboardData.items[i];

            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    evt.preventDefault();
                    const cursor = editor.getCursor();
                    await this.uploaderView.upload(file, editor, cursor);
                    break;
                }
            }
        }
    }

    // 注册命令
    private registerCommands() {
        this.commandConfigs.forEach(config => {
            if (this.settings[config.key as keyof AutoImageSettings]) {
                this.addCommand({
                    id: config.id,
                    name: config.title(),
                    checkCallback: (checking: boolean) => {
                        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                        if (markdownView && markdownView.editor) {
                            if (!checking) {
                                const selectedText = markdownView.editor.getSelection();
                                if (selectedText) {
                                    this.executeAction(config, selectedText, markdownView.editor);
                                } else {
                                    new Notice(i18n.getNoSelectionText());
                                }
                            }
                            return true;
                        }
                        return false;
                    },
                });
            }
        });
    }

    // 执行操作
    private async executeAction(config: any, selectedText: string, editor?: Editor) {
        try {
            await config.action(selectedText, editor);
        } catch (error) {
            console.error(`${config.id} failed:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`${i18n.t.general[config.errorKey as keyof typeof i18n.t.general]}: ${errorMessage}`);
        }
    }

    // 更新命令
    private updateCommands() {
        // @ts-ignore - 访问内部 commands 对象
        this.commands = {};
        this.registerCommands();
    }
}