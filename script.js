/**
 * 汉诺塔游戏核心类
 * 遵循面向对象风格，使用数组作为栈(Stack)来管理状态
 */
class HanoiGame {
    constructor() {
        // DOM 元素引用
        this.dom = {
            diskInput: document.getElementById('diskCountInput'),
            moveCounter: document.getElementById('moveCounter'),
            resetBtn: document.getElementById('resetBtn'),
            autoSolveBtn: document.getElementById('autoSolveBtn'),
            pegWrappers: document.querySelectorAll('.peg-wrapper'),
            warningMsg: document.getElementById('warningMsg'),
            victoryOverlay: document.getElementById('victoryOverlay'),
            finalMoves: document.getElementById('finalMoves'),
            playAgainBtn: document.getElementById('playAgainBtn')
        };

        // 游戏状态对象 (单一数据源)
        this.state = {
            disksCount: 5,
            pegs: [[], [], []],      // 3个柱子，每个是一个数组(栈)
            moves: 0,
            isAutoSolving: false,
            selectedPegIndex: null   // 记录当前选中的柱子索引
        };

        this.init();
    }

    // 初始化游戏及绑定事件
    init() {
        this.resetGame();
        
        // 监听盘子数量改变
        this.dom.diskInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if (val < 3) val = 3; if (val > 8) val = 8;
            e.target.value = val;
            this.state.disksCount = val;
            this.resetGame();
        });

        // 监听柱子的点击事件 (点击选择 / 点击放置)
        this.dom.pegWrappers.forEach((wrapper, index) => {
            wrapper.addEventListener('click', () => this.handlePegClick(index));
        });

        // 按钮事件
        this.dom.resetBtn.addEventListener('click', () => this.resetGame());
        this.dom.autoSolveBtn.addEventListener('click', () => this.autoSolve());
        this.dom.playAgainBtn.addEventListener('click', () => {
            this.dom.victoryOverlay.classList.add('hidden');
            this.resetGame();
        });
    }

    // 重置游戏状态并重新渲染
    resetGame() {
        this.state.moves = 0;
        this.state.selectedPegIndex = null;
        this.state.isAutoSolving = false;
        // 使用 Array.from 创建初始状态，最大的在最底下
        this.state.pegs = [
            Array.from({length: this.state.disksCount}, (_, i) => this.state.disksCount - i),
            [],
            []
        ];
        
        this.updateUI();
        this.setControlsDisabled(false);
    }

    // 处理柱子点击的核心逻辑
    handlePegClick(pegIndex) {
        if (this.state.isAutoSolving) return; // 自动演示时禁用手动操作

        // 情况 1：没有选中任何盘子 -> 尝试选中该柱子的最上方盘子
        if (this.state.selectedPegIndex === null) {
            const stack = this.state.pegs[pegIndex];
            if (stack.length > 0) {
                this.state.selectedPegIndex = pegIndex;
                this.renderDisks(); // 重新渲染以显示高亮
            }
        } 
        // 情况 2：已经选中了盘子 -> 尝试放到当前柱子
        else {
            const from = this.state.selectedPegIndex;
            const to = pegIndex;
            
            if (from === to) {
                // 点击同一个柱子，取消选择
                this.state.selectedPegIndex = null;
                this.renderDisks();
                return;
            }

            if (this.isValidMove(from, to)) {
                this.executeMove(from, to);
            } else {
                this.showWarning("⚠️ Invalid Move! Cannot place larger disk on smaller.");
                this.state.selectedPegIndex = null;
                this.renderDisks();
            }
        }
    }

    // 验证移动是否合法
    isValidMove(from, to) {
        const fromStack = this.state.pegs[from];
        const toStack = this.state.pegs[to];
        if (fromStack.length === 0) return false;
        if (toStack.length === 0) return true;
        return fromStack[fromStack.length - 1] < toStack[toStack.length - 1];
    }

    // 执行移动并更新状态
    executeMove(from, to) {
        const disk = this.state.pegs[from].pop(); // ✅ REQUIRED pop()
        this.state.pegs[to].push(disk);           // ✅ REQUIRED push()
        this.state.moves++;
        this.state.selectedPegIndex = null;
        
        this.updateUI();
        this.checkWin();
    }

    // 检查是否获胜
    checkWin() {
        if (this.state.pegs[2].length === this.state.disksCount) {
            this.dom.finalMoves.textContent = this.state.moves;
            this.dom.victoryOverlay.classList.remove('hidden');
            this.setControlsDisabled(true);
        }
    }

    // 递归自动求解算法 (异步版)
    async autoSolve() {
        if (this.state.isAutoSolving) return;
        this.resetGame();
        this.state.isAutoSolving = true;
        this.setControlsDisabled(true);

        const solve = async (n, source, target, auxiliary) => {
            if (n === 0) return;
            await solve(n - 1, source, auxiliary, target);
            await this.delay(600); // 每步延迟 0.6秒
            
            // 直接调用内部执行，不触发 win 检测直到最后
            const disk = this.state.pegs[source].pop();
            this.state.pegs[target].push(disk);
            this.state.moves++;
            this.updateUI();
            
            await solve(n - 1, auxiliary, target, source);
        };

        await solve(this.state.disksCount, 0, 2, 1);
        
        // 完成后解锁并判定胜利
        this.state.isAutoSolving = false;
        this.setControlsDisabled(false);
        this.checkWin();
    }

    // 辅助延时函数
    delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    // 更新所有 UI 元素
    updateUI() {
        this.dom.moveCounter.textContent = this.state.moves;
        this.renderDisks();
    }

    // 根据 state.pegs 重新渲染所有盘子 (DOM 纯粹由状态驱动)
    renderDisks() {
        // 清空现有的盘子
        document.querySelectorAll('.disk').forEach(el => el.remove());

        // 遍历每一个柱子
        this.state.pegs.forEach((stack, pegIndex) => {
            const wrapper = this.dom.pegWrappers[pegIndex];
            
            // 遍历柱子上的每一个盘子
            stack.forEach((diskSize, stackIndex) => {
                const diskEl = document.createElement('div');
                diskEl.className = 'disk';
                diskEl.style.setProperty('--size', diskSize);
                diskEl.dataset.color = diskSize;
                
                // 计算底部偏移量实现堆叠
                diskEl.style.bottom = `${stackIndex * 25}px`; 

                // 如果是被选中的最顶层盘子，添加高亮
                if (this.state.selectedPegIndex === pegIndex && stackIndex === stack.length - 1) {
                    diskEl.classList.add('selected');
                }
                wrapper.appendChild(diskEl);
            });
        });
    }

    // 显示警告信息
    showWarning(msg) {
        this.dom.warningMsg.textContent = msg;
        this.dom.warningMsg.classList.remove('hidden');
        this.dom.warningMsg.classList.add('show');
        setTimeout(() => {
            this.dom.warningMsg.classList.remove('show');
            setTimeout(() => this.dom.warningMsg.classList.add('hidden'), 300);
        }, 1500);
    }

    // 禁用/启用控件 (用于自动演示期间)
    setControlsDisabled(disabled) {
        this.dom.diskInput.disabled = disabled;
        this.dom.resetBtn.disabled = disabled;
        this.dom.autoSolveBtn.disabled = disabled;
    }
}

// 页面加载完毕后启动游戏
window.onload = () => new HanoiGame();
