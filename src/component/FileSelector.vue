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
        工作模式: {{ parallel ? '多线程 Worker' : '单线程 Queue' }}
        <el-tooltip effect="dark" placement="top-start">
          <div slot="content">
            将此工具部署在 HTTPS 环境下，可启用 Web Worker 特性，<br />
            从而更快的利用并行处理完成解锁
          </div>
          <i class="el-icon-info" />
        </el-tooltip>
      </span>
    </div>
    <transition name="el-fade-in">
      <el-progress
        v-show="progress_show"
        :format="progress_string"
        :percentage="progress_value"
        :stroke-width="14"
        :text-inside="true"
        class="um-dropzone-progress"
      />
    </transition>
  </el-upload>
</template>

<script>
import { spawn, Worker, Pool } from 'threads';
import { Decrypt } from '@/decrypt';
import { DecryptQueue } from '@/utils/utils';
import { storage } from '@/utils/storage';

export default {
  name: 'FileSelector',
  data() {
    return {
      task_all: 0,
      task_finished: 0,
      queue: new DecryptQueue(), // for http or file protocol
      parallel: false,
    };
  },
  computed: {
    progress_value() {
      return this.task_all ? (this.task_finished / this.task_all) * 100 : 0;
    },
    progress_show() {
      return this.task_all !== this.task_finished;
    },
  },
  mounted() {
    if (window.Worker && window.location.protocol !== 'file:' && process.env.NODE_ENV === 'production') {
      console.log('Using Worker Pool');
      this.queue = Pool(() => spawn(new Worker('@/utils/worker.ts')), navigator.hardwareConcurrency || 1);
      this.parallel = true;
    } else {
      console.log('Using Queue in Main Thread');
    }
  },
  methods: {
    progress_string() {
      return `${this.task_finished} / ${this.task_all}`;
    },
    async addFile(file) {
      this.task_all++;
      this.queue.queue(async (dec = Decrypt) => {
        console.log('start handling', file.name);
        try {
          this.$emit('success', await dec(file, await storage.getAll()));
        } catch (e) {
          console.error(e);
          this.$emit('error', e, file.name);
        } finally {
          this.task_finished++;
        }
      });
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
  .um-dropzone-progress {
    margin: 16px 6px 0;
  }
}
</style>
