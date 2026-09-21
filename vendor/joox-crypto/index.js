// 本地占位实现，替代无法从私有仓库下载的 @unlock-music/joox-crypto。
// 工厂返回 null，调用方（src/decrypt/joox.ts）会按"不支持的 joox 加密格式"处理，
// 即 Joox 解密功能在本构建中不可用，其余功能不受影响。
module.exports = function jooxFactory() {
  return null;
};
