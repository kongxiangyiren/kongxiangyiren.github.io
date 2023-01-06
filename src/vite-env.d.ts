/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
declare module 'vue-wechat-title';

declare module 'live2d-widget' {
  const L2Dwidget: {
    /** 网址: https://l2dwidget.js.org/docs/class/src/index.js~L2Dwidget.html#instance-method-init */
    init(
      /**  用户自定义设置 */
      userConfig: {
        model: {
          /** model主文件路径 */
          jsonPath: string;
          /** canvas 模型与canvas的缩放 默认: 1 */
          scale?: number;
        };
        display?: {
          /** 超采样等级 默认: 2 */
          superSample?: number;
          /** canvas的长度 默认: 150 */
          width?: number;
          /** canvas的高度 默认: 300 */
          height?: number;
          /** 显示位置：左或右 默认: 'right' */
          position?: 'left' | 'right';
          /** canvas水平偏移 默认: 0 */
          hOffset?: number;
          /** canvas垂直偏移 默认: -20 */
          vOffset?: number;
        };
        mobile?: {
          /** 是否在移动设备上显示 默认: true */
          show?: boolean;
          /** 移动设备上的缩放 默认: 0.5 */
          scale?: number;
        };
        name?: {
          /** canvas元素的ID 默认: 'live2dcanvas' */
          canvas?: string;
          /** div元素的ID 默认: 'live2d-widget' */
          div?: string;
        };
        react?: {
          /** 透明度 默认: 0.7 */
          opacity?: number;
        };
        dev?: {
          /** 在canvas周围显示边界 默认: false */
          border?: boolean;
        };
        dialog?: {
          /** 显示人物对话框 默认: false */
          enable?: boolean;
          /** 使用一言API 默认: false */
          hitokoto?: boolean;
        };
      }
    );
  };
}
