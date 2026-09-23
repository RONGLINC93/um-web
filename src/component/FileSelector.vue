<template>
  <el-upload
    :auto-upload="false"
    :on-change="addFile"
    :show-file-list="false"
    action=""
    drag
    multiple
    class="um-dropzone-upload"
  >
    <div class="um-dropzone-inner">
      <i class="el-icon-upload um-dropzone-icon" />
      <div class="um-dropzone-title">将加密音乐拖到此处，或 <em>点击选择</em></div>
      <div class="um-dropzone-sub">
        支持 网易云(ncm) · QQ(qmc/mflac/mgg) · 酷狗(kgm) · 虾米(xm) · 酷我(kwm)，解密全程在本机完成
      </div>
    </div>
    <div slot="tip" class="um-dropzone-tip">
      <span>
        仅在本机浏览器内解锁，不上传任何文件
        <el-tooltip effect="dark" placement="top-start">
          <div slot="content">算法已在源代码中提供，所有运算都发生在本地</div>
          <i class="el-icon-info" />
        </el-tooltip>
      </span>
      <span>
        串行解锁：导入后按文件一个一个依次解锁
        <el-tooltip effect="dark" placement="top-start">
          <div slot="content">逐个解锁可避免大量文件同时占用内存，列表中可实时查看每个文件的状态</div>
          <i class="el-icon-info" />
        </el-tooltip>
      </span>
    </div>
  </el-upload>
</template>

<script>
import { Decrypt } from '@/decrypt';
import { DecryptQueue } from '@/utils/utils';
import { storage } from '@/utils/storage';

export default {
  name: 'FileSelector',
  data() {
    return {
      queue: new DecryptQueue(), // 严格串行：一次只解锁一个文件
      seq: 0,
    };
  },
  methods: {
    async addFile(file) {
      const id = ++this.seq;
      // 先通知外部建立列表项（排队中），再串行解锁
      this.$emit('add', { id, name: file.name, size: file.size });
      this.queue.queue(async () => {
        console.log('start handling', file.name);
        try {
          this.$emit('update', { id, status: 'processing' });
          const data = await this.withTimeout(Decrypt(file, await storage.getAll()));
          this.$emit('update', { id, status: 'done' });
          this.$emit('success', { id, data });
        } catch (e) {
          console.error(e);
          this.$emit('update', { id, status: 'failed' });
          this.$emit('error', e, file.name);
        }
      });
    },
    withTimeout(promise, ms = 120000) {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('处理超时，请重试或减少并发文件数')), ms)
        ),
      ]);
    },
  },
};
</script>

<style lang="scss" scoped>
.um-dropzone-upload {
  // 放大的拖拽区
  // 注意：scss 中不能用 >>>（会被编译成无效的 "> > >"），必须用 ::v-deep
  ::v-deep .el-upload {
    width: 100%;
    display: block;
  }
  ::v-deep .el-upload-dragger {
    width: 100%;
    height: auto;
    padding: 52px 24px;
    border: 2px dashed #409eff;
    border-radius: 16px;
    background: var(--um-drop-bg);
    transition: border-color 0.2s ease, background 0.2s ease;
    box-sizing: border-box;
  }
  ::v-deep .el-upload-dragger:hover {
    border-color: #85ce61;
    background: var(--um-drop-bg-hover);
  }
  .um-dropzone-icon {
    font-size: 64px;
    color: #409eff;
    margin: 0;
  }
  .um-dropzone-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--um-text-main);
    margin-top: 10px;
    em {
      font-style: normal;
      color: #409eff;
    }
  }
  .um-dropzone-sub {
    font-size: 12px;
    color: var(--um-text-comment);
    margin-top: 8px;
    line-height: 1.5;
  }
  .um-dropzone-tip {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 24px;
    margin-top: 12px;
    font-size: 12px;
    color: var(--um-text-comment);
    i {
      margin-left: 4px;
      font-size: 12px;
    }
  }

}
</style>
