import {Editor} from "obsidian";

export interface AutoImageSettings {
    apiBaseURL: string;
    token: string;
    strategy_id: number;
    newWorkBlackDomains: string;
    image_width: number;
    limit_count: number;
    is_upload_clipboard: boolean;
    showUploadButton: boolean;
    is_need_delete: boolean;
    showDeleteButton: boolean;
    showDownloadButton: boolean;
    defaultDownloadPath: string;
}

export interface CommandConfig {
    id: string;
    key: string;
    title: () => string;
    icon: string;
    action: (selectedText: string, editor: Editor) => Promise<void>;
    errorKey: string;
}


export const DEFAULT_SETTINGS: AutoImageSettings = {
    apiBaseURL: "",
    token: "",
    strategy_id: 1,
    newWorkBlackDomains: "",
    image_width: 700,
    limit_count: 50,
    is_upload_clipboard: false,
    showUploadButton: true,
    is_need_delete: false,
    showDeleteButton: false,
    showDownloadButton: false,
    defaultDownloadPath: '',
};
// API 响应类型定义
export interface LskyUploadResponse {
  data?: {
    links?: {
      url: string;
    };
    url?: string;
    // 其他可能的字段
  };
  url?: string;
  status?: string;
  message?: string;
}

export interface LskyImageListResponse {
  data: {
    data: Array<{
      name: string;
      key: string;
    }>;
  };
  status?: string;
  message?: string;
}