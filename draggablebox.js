let DraggableBox = (function() {
    // DOM操作，工具方法
    const DOM = {
        // 获取鼠标在盒子的哪个方位, n、s、w、e
        getDirection(event, el, itemBorderWidth = 0) {
            let xPos = event.offsetX;
            let yPos = event.offsetY;

            let num = 100;
            let target = event.target;
            while (target.className !== el.className && (--num) > 0) {
                xPos += target.offsetLeft;
                yPos += target.offsetTop;

                target = target.parentElement;
            }

            const offset = Math.max(10, itemBorderWidth * 2); // 计算在盒子哪个边框时，使用的距离值

            let dir = "";
            if (yPos < offset) {
                dir += "n";
            } else if (yPos > el.offsetHeight - offset) {
                dir += "s";
            }
            if (xPos < offset) {
                dir += "w";
            } else if (xPos > el.offsetWidth - offset) {

                dir += "e";
            }

            return dir;
        },
        // 获取盒子的一些属性
        getNodeAttr(el) {
            if (!el) return {
                width: 0,
                height: 0
            };

            return {
                width: parseInt(el.style.width),
                height: parseInt(el.style.height)
            }
        },
        getReal(el, type, value) {
            let temp = el;
            while ((temp != null) && (temp.tagName != "BODY")) {
                if (eval("temp." + type) == value) {
                    el = temp;
                    return el;
                }
                temp = temp.parentElement;
            }
            return el;
        }
    }

    const ERROR_EMNU = {
        'HTMLElement': 'The Type Must Be HTMLElement',
        'number': 'The Type Must Be Number And Greater Then Or Equal 0',
        'boolean': 'The Type Must Be Boolean',
        'string': 'The Type Must String'
    }

    function DragInfo() {
        this.el = null; // 记录鼠标悬浮的盒子
        this.els = null; // 记录与鼠标悬浮的盒子，同列或同行的所有盒子
        this.nearEls = null; // 记录与鼠标悬浮的盒子，相邻同列或同行的所有盒子
        this.dir = ""; // 记录鼠标在盒子的哪个方位，n、s、w、e
        this.startX = null; // 记录鼠标下压时，x轴的位置
        this.startY = null; // 记录鼠标下压时，ｙ轴的位置
    }

    function DraggableBox(obj) {
        if (!new.target) {
            throw new Error('Must Use New Call DraggableBox')
        }

        this.el = obj.el || null; // 可拖动网格元素
        this.width = obj.width || 400;
        this.height = obj.height || 300;
        this.rows = obj.rows || 2; // 行数
        this.cols = obj.cols || 2; // 列数
        this.allowDrag = obj.allowDrag === false ? false : true; // 是否允许拖动，默认允许
        this.autoRender = obj.autoRender === false ? false : true; // 默认自动渲染容器里的元素
        this.noOuterBorder = obj.noOuterBorder === false ? false : true; // 无最外层的边框，默认无
        this.itemMinWidth = obj.itemMinWidth || 0; // 网格中盒子的最小宽度
        this.itemMinHeight = obj.itemMinHeight || 0; // 网格中盒子的最小高度
        this.itemBorderWidth = obj.itemBorderWidth || 0; // 网格中盒子的边框宽度
        this.itemBorderColor = obj.itemBorderColor || '#ccc'; // 网格中盒子的边框的颜色
        this.itemBorderStyle = obj.itemBorderStyle || 'solid'; // 边框样式
        this.itemMargin = obj.itemMargin || 0; // 网格中盒子的外边距
        this.itemWidthHeight = obj.itemWidthHeight || { width: [], height: [] }; // 记录网格，每行的行高、每列的列宽
        this.dragInfo = null; // 网格中盒子边框被拖动时，记录目标盒子、相邻盒子、方向、鼠标起始位置信息
        this.change = obj.change || null;
        this.percent = 1;

        this.wrapClassName = 'drag-grid-wrap'; // 容器的class
        this.itemGroupClassName = 'drag-group';
        this.itemClassName = 'drag-item';
        this.itemMoveClassName = 'drag-item-move'; // 当拖动时，为元素添加一层遮罩，解决内容去为iframe时无法拖动问题

        this.preCheckParam(); // 参数预校验，校验失败，则阻塞运行
        this.initState(); // 状态值初始化
        this.render(); // 初始化渲染盒子
        this.allowDrag === true ? this.registerEvent() : ''; // 为网格注册鼠标左键下压、鼠标移动、鼠标左键弹起事件
    }

    /**
     * 参数检查
     */
    DraggableBox.prototype.preCheckParam = function() {
        // 容器元素校验
        if (this.el === null || !(this.el instanceof HTMLElement)) {
            throw new Error(ERROR_EMNU.HTMLElement + ' -> el');
        }

        // number类型校验
        let errorKeys = [];
        const numberKeys = ['width', 'height', 'itemMinWidth', 'itemMinHeight', 'itemBorderWidth', 'itemMargin'];
        this.autoRender === true ? numberKeys.push(...['rows', 'cols']) : '';
        numberKeys.forEach(key => {
            if (!(/[0-9]+/.test(this[key]) && this[key] >= 0)) {
                errorKeys.push(key)
            } else {
                this[key] = parseInt(this[key])
            }
        });
        if (errorKeys.length > 0) {
            throw new Error(ERROR_EMNU.number + ' -> ' + errorKeys)
        }

        // 字符串校验
        errorKeys = [];
        const stringKeys = ['itemBorderStyle', 'itemBorderColor'];
        stringKeys.forEach(key => {
            if (typeof this[key] !== 'string') {
                errorKeys.push(key)
            }
        });
        if (errorKeys.length > 0) {
            throw new Error(ERROR_EMNU.number + ' -> ' + errorKeys)
        }
    }

    /**
     * 数据初始化处理
     */
    DraggableBox.prototype.initState = function() {
        this.initRowCol();
        this.initGridState();
        this.initGridItemState();
    }

    /**
     * 不需要自动渲染网格时，需要重新计算真实的行数、列数
     */
    DraggableBox.prototype.initRowCol = function() {
        if (this.autoRender === true) return;

        let groups = this.el.children;
        this.rows = groups.length || 0;

        if (groups.length === 0) {
            this.cols = 0;
        } else {
            this.cols = [].slice.call(groups).reduce((pre, next) => {
                return Math.max(pre, next.children.length)
            }, 0)
        }
    }

    /**
     * 初始化容器的宽高
     */
    DraggableBox.prototype.initGridState = function() {
        let parentNode = this.el.parentElement;
        let clientHeight = parentNode.clientHeight;
        let clientWidth = parentNode.clientWidth;

        let percent = 0,
            useful = false;

        this.realHeight = this.height;
        this.realWidth = this.width;

        if (clientHeight === 0) {
            this.realHeight = 0;
            this.realWidth = Math.min(this.realWidth, clientWidth);

            let disWidth = this.width - clientWidth;
            if (disWidth > 0) {
                percent = disWidth / this.width;
            }

            useful = true;
        }

        if (clientHeight === 0) {
            this.realHeight = Math.min(this.realHeight, clientHeight);
            this.realWidth = 0;

            let disHeight = this.height - clientHeight;
            if (disHeight > 0) {
                percent = disHeight / this.height;
            }
            useful = true;
        }

        let disHeight = this.height - clientHeight;
        if (useful === false && clientHeight !== 0 && disHeight > 0) {
            percent = disHeight / this.height;
            useful = this.width * percent < clientWidth;

            if (useful === true) {
                this.realHeight = clientHeight;
                this.realWidth = this.width * (1 - percent);
            }
        }

        let disWidth = this.width - clientWidth;
        if (useful === false && clientWidth !== 0 && disWidth > 0) {
            percent = disWidth / this.width;
            useful = this.height * percent < clientHeight;

            if (useful === true) {
                this.realWidth = clientWidth;
                this.realHeight = this.height * (1 - percent);
            }
        }

        this.percent = 1 - percent;
    }

    /**
     * 初始化容器中每个盒子的宽高
     */
    DraggableBox.prototype.initGridItemState = function() {
        let itemWidthHeight = this.itemWidthHeight || {};
        let widthArr = itemWidthHeight.width || [];
        let heightArr = itemWidthHeight.height || [];

        // 当盒子没有初始化宽高、或者盒子个数与rows*cols不匹配时，平均分配盒子的宽高
        if (widthArr.length === 0 || heightArr.length === 0 || widthArr.length !== this.cols || heightArr.length !== this.rows) {
            this.itemWidthHeight = {
                width: [],
                height: []
            }
            return;
        }

        // 根据新的网格的宽高，按比例重新分配每个盒子的宽高
        let totalWidth = widthArr.reduce((pre, next) => {
            return pre + next;
        }, 0);
        let totalHeight = heightArr.reduce((pre, next, index) => {
            return pre + next;
        }, 0);

        let otherDis = 2 * this.itemMargin;
        widthArr = widthArr.map(item => {
            return item / totalWidth * this.realWidth - otherDis;
        })
        heightArr = heightArr.map(item => {
            return item / totalHeight * this.realHeight - otherDis;
        })

        this.itemWidthHeight = {
            width: widthArr,
            height: heightArr
        }
    }

    /**
     * 计算CSS样式
     */
    DraggableBox.prototype.calculateCssText = function() {
        // 网格的宽高样式
        let wrapCssText = this.el.style.cssText + 'width: ' + this.realWidth + 'px; height: ' + this.realHeight + 'px;';

        // 网格中分组的样式
        let itemGroupCssText = 'display: flex;flex-wrap: nowrap;';

        let asideDis = this.itemMargin * 2;
        let itemBaseWidth = Math.floor(this.realWidth / this.cols) - asideDis;
        let itemBaseHeight = Math.floor(this.realHeight / this.rows) - asideDis;
        let itemBaseCssText = 'box-sizing: border-box;border: ' + this.itemBorderWidth + 'px ' + this.itemBorderStyle + ' ' + this.itemBorderColor + ';overflow: hidden;margin: ' + this.itemMargin + 'px;'

        let itemWidthHeight = this.itemWidthHeight || {};
        let itemWidth = itemWidthHeight.width || [];
        let itemHeight = itemWidthHeight.height || [];

        // 网格中每个盒子的样式
        let itemCssText = [];
        for (let i = 0; i < this.rows; i++) {
            let height = itemHeight[i] || itemBaseHeight;
            for (let j = 0; j < this.cols; j++) {
                let width = itemWidth[j] || itemBaseWidth;
                let cssText = itemBaseCssText + 'width:' + width + 'px; height:' + height + 'px;position: relative;'
                itemCssText.push(cssText);
            }
        }

        // 动态增加伪类样式
        let style = document.createElement('style');
        style.id = "grid-drag-css";
        style.innerText = '.' + this.itemMoveClassName + ':after{content: " ";width: 100%;height: 100%;position: absolute;top: 0px;left: 0px;opacity: 0;}';
        document.head.appendChild(style)

        return {
            wrapCssText: wrapCssText,
            itemGroupCssText: itemGroupCssText,
            itemCssText: itemCssText
        }
    }

    /**
     * DOM和Style的渲染
     */
    DraggableBox.prototype.render = function() {
        this.autoRender === true ? this.domRender() : '';
        this.cssRender();
    }

    /**
     * 自动渲染网格中的DOM元素
     */
    DraggableBox.prototype.domRender = function() {
        let el = this.el;
        let rows = this.rows;
        let cols = this.cols;

        if (el === null || rows <= 0 || cols <= 0) return;

        el.classList.add(this.wrapClassName);

        let fragment = document.createDocumentFragment();
        let index = 0;
        for (let i = 0; i < rows; i++) {
            let group = document.createElement('div');
            group.classList.add(this.itemGroupClassName);

            for (let j = 0; j < cols; j++) {
                let box = document.createElement('div');
                box.classList.add(this.itemClassName);

                group.appendChild(box);
            }

            fragment.appendChild(group);
        }

        [].slice.call(el.children).forEach(item => {
            el.removeChild(item)
        })
        el.appendChild(fragment)
    }

    /**
     * CSS渲染
     */
    DraggableBox.prototype.cssRender = function() {
        let el = this.el;
        if (el === null) return;

        // class更新
        this.autoRender === false ? this.classRender() : '';
        // style样式更新
        this.styleRender();
        // 去除容器的边框
        this.noOuterBorder === true ? this.noOutterBorder() : '';
    }

    /**
     * className的添加
     */
    DraggableBox.prototype.classRender = function() {
        let el = this.el;

        el.classList.add(this.wrapClassName);

        [].slice.call(el.children).forEach(group => {
            group.classList.add(this.itemGroupClassName);

            [].slice.call(group.children).forEach(item => {
                item.classList.add(this.itemClassName);
            })
        })
    }

    /**
     * style样式的修改
     */
    DraggableBox.prototype.styleRender = function() {
        let ctInfo = this.calculateCssText();

        // 容器样式渲染
        let wrapNodes = document.getElementsByClassName(this.wrapClassName);
        [].slice.call(wrapNodes).forEach(wrap => {
            wrap.style.cssText += ctInfo.wrapCssText;
        });

        // 分组样式渲染
        let dragGroupNodes = document.getElementsByClassName(this.itemGroupClassName);
        [].slice.call(dragGroupNodes).forEach(group => {
            group.style.cssText += ctInfo.itemGroupCssText;
        });

        // 盒子样式渲染
        let dragItemNodes = document.getElementsByClassName(this.itemClassName);
        [].slice.call(dragItemNodes).forEach((item, index) => {
            item.style.cssText += ctInfo.itemCssText[index];
        });
    }

    /**
     * 去除容器的边框
     */
    DraggableBox.prototype.noOutterBorder = function() {
        let dragGroupNodes = document.getElementsByClassName(this.itemGroupClassName);

        let allGroups = [].slice.call(dragGroupNodes);
        let len = allGroups.length;
        allGroups.forEach((group, rowIndex) => {
            if (rowIndex === 0) {
                [].slice.call(group.children).forEach(item => {
                    item.style.cssText += 'border-top: none;';
                })
            }

            if (rowIndex === len - 1) {
                [].slice.call(group.children).forEach(item => {
                    item.style.cssText += 'border-bottom: none;';
                })
            }

            group.firstElementChild.style.cssText += 'border-left: none;';
            group.lastElementChild.style.cssText += 'border-right: none;';
        });
    }

    /**
     * 注册鼠标移动事件
     */
    DraggableBox.prototype.registerEvent = function() {
        let el = this.el;
        if (el === null) return;

        el.onmousedown = this.mouseDownEvent.bind(this);
        el.onmousemove = this.mouseMoveEvent.bind(this);
        el.onmouseup = this.mouseUpEvent.bind(this);
        el.onmouseleave = this.mouseUpEvent.bind(this);
    }

    /**
     * 获取目标元素同行（或列）和关联行（列）的DOM节点
     */
    DraggableBox.prototype.getNearEls = function(el, dir) {
        let parentGroup = el.parentElement;
        let rowIndex = [].slice.call(parentGroup.parentElement.children).indexOf(parentGroup);
        let colIndex = [].slice.call(parentGroup.children).indexOf(el);

        let totalRows = parentGroup.parentElement.children.length;
        let totalCols = parentGroup.children.length;

        let els = [];
        let nearEls = [];

        if (dir === 'n' || dir === 's') {
            els = parentGroup.children;
        }
        if (dir === 'w' || dir === 'e') {
            [].slice.call(parentGroup.parentElement.children).forEach(item => {
                els.push(item.children[colIndex]);
            })
        }

        if (dir === 'n' && (rowIndex - 1) >= 0) {
            nearEls = parentGroup.parentElement.children[rowIndex - 1].children
        }
        if (dir === 's' && (rowIndex + 1) < totalRows) {
            nearEls = parentGroup.parentElement.children[rowIndex + 1].children
        }
        if (dir === 'w') {
            [].slice.call(parentGroup.parentElement.children).forEach(item => {
                let ele = item.children[colIndex - 1]
                ele ? nearEls.push(ele) : '';
            })
        }
        if (dir === 'e') {
            [].slice.call(parentGroup.parentElement.children).forEach(item => {
                let ele = item.children[colIndex + 1]
                ele ? nearEls.push(ele) : '';
            })
        }

        return { els: els, nearEls: nearEls }
    }

    /**
     * 鼠标左键下压事件
     */
    DraggableBox.prototype.mouseDownEvent = function(event) {
        event = event || window.event;
        var el = DOM.getReal(event.srcElement, "className", this.itemClassName);

        if (el == null) {
            this.dragInfo = null;
            return;
        }

        let dir = DOM.getDirection(event, el, this.itemBorderWidth);
        if (dir == "" || dir.length === 2) return;

        this.dragInfo = new DragInfo();

        this.dragInfo.el = el;
        this.dragInfo.dir = dir;

        this.dragInfo.startX = event.clientX;
        this.dragInfo.startY = event.clientY;

        let nodeInfo = this.getNearEls(el, dir);
        this.dragInfo.els = nodeInfo.els;
        this.dragInfo.nearEls = nodeInfo.nearEls;

        this.dragInfo.elAttr = DOM.getNodeAttr(nodeInfo.els[0]);
        this.dragInfo.nearElAttr = DOM.getNodeAttr(nodeInfo.nearEls[0]);

        // 开始拖动时，为盒子添加遮罩，解决碰到iframe无法拖动问题
        [].slice.call(document.getElementsByClassName(this.itemClassName)).forEach(item => {
            item.classList.toggle(this.itemMoveClassName);
        })

        event.returnValue = false;
        event.cancelBubble = true;
    }

    /**
     * 鼠标移动事件
     */
    DraggableBox.prototype.mouseMoveEvent = function(event) {
        event = event || window.event;

        let dragInfo = this.dragInfo;
        if (dragInfo && (!dragInfo.nearEls || dragInfo.nearEls.length === 0)) return;

        this.updateMouseCursor(event);
        this.updateItemPosition(event);

        event.returnValue = false;
        event.cancelBubble = true;
    }

    /**
     * 更新鼠标的形状
     */
    DraggableBox.prototype.updateMouseCursor = function(event) {
        let el = DOM.getReal(event.srcElement, "className", this.itemClassName);

        if (el.classList.contains(this.itemClassName)) {
            let dir = DOM.getDirection(event, el, this.itemBorderWidth);
            if (dir.length === 2) return;

            if (dir == "") dir = "default";
            else dir += "-resize";
            el.style.cursor = dir;
        }
    }

    /**
     * 更新盒子的位置
     */
    DraggableBox.prototype.updateItemPosition = function(event) {
        let dragInfo = this.dragInfo;

        if (dragInfo != null) {
            let dir = dragInfo.dir;

            if (dir.indexOf("n") != -1) {
                let distance = this.calculateRealMoveDistance(event, 'n');

                this.nMove(dragInfo.els, dragInfo.elAttr, distance);
                this.sMove(dragInfo.nearEls, dragInfo.nearElAttr, distance);
            }
            if (dir.indexOf("s") != -1) {
                let distance = this.calculateRealMoveDistance(event, 's');

                this.sMove(dragInfo.els, dragInfo.elAttr, distance);
                this.nMove(dragInfo.nearEls, dragInfo.nearElAttr, distance);
            }
            if (dir.indexOf("w") != -1) {
                let distance = this.calculateRealMoveDistance(event, 'w');

                this.wMove(dragInfo.els, dragInfo.elAttr, distance);
                this.eMove(dragInfo.nearEls, dragInfo.nearElAttr, distance);
            }
            if (dir.indexOf("e") != -1) {
                let distance = this.calculateRealMoveDistance(event, 'e');

                this.eMove(dragInfo.els, dragInfo.elAttr, distance);
                this.wMove(dragInfo.nearEls, dragInfo.nearElAttr, distance);
            }

        }
    }

    /**
     * 计算盒子边框真正可移动的距离，规则：
     * 可移动的距离 MIN（鼠标移动的距离，相邻盒子高度、宽度- 盒子最小高度、宽度）
     * @param {String} dir 方向，n、s、w、e
     */
    DraggableBox.prototype.calculateRealMoveDistance = function(event, dir) {
        if (!dir) return 0;

        let mouseDistance = 0; // 鼠标移动的距离
        let sign = 1; // 鼠标移动的方向，1位正向，-1为负向
        let maxMovableDistance = 0; // 移动时，相邻两个盒子，使用的最小高度

        let dragInfo = this.dragInfo;
        if (dir === 'n') {
            mouseDistance = event.clientY - dragInfo.startY;
            sign = mouseDistance > 0 ? 1 : -1;
            maxMovableDistance = sign === 1 ? dragInfo.elAttr.height : dragInfo.nearElAttr.height;
            maxMovableDistance -= this.itemMinHeight;
        } else if (dir === 's') {
            mouseDistance = event.clientY - dragInfo.startY;
            sign = mouseDistance > 0 ? 1 : -1;
            maxMovableDistance = sign === 1 ? dragInfo.nearElAttr.height : dragInfo.elAttr.height;
            maxMovableDistance -= this.itemMinHeight;
        } else if (dir === 'w') {
            mouseDistance = event.clientX - dragInfo.startX;
            sign = mouseDistance > 0 ? 1 : -1;
            maxMovableDistance = sign === 1 ? dragInfo.elAttr.width : dragInfo.nearElAttr.width;
            maxMovableDistance -= this.itemMinWidth;
        } else if (dir === 'e') {
            mouseDistance = event.clientX - dragInfo.startX;
            sign = mouseDistance > 0 ? 1 : -1;
            maxMovableDistance = sign === 1 ? dragInfo.nearElAttr.width : dragInfo.elAttr.width;
            maxMovableDistance -= this.itemMinWidth;
        }

        return Math.min(Math.abs(mouseDistance), maxMovableDistance) * sign;
    }

    DraggableBox.prototype.nMove = function(els, attr, distance) {
        [].slice.call(els).forEach(item => {
            if (item) {
                item.style.height = (attr.height - distance) + "px";
            }
        })
    }

    DraggableBox.prototype.sMove = function(els, attr, distance) {
        [].slice.call(els).forEach(item => {
            if (item) {
                item.style.height = (attr.height + distance) + "px";
            }
        })
    }

    DraggableBox.prototype.wMove = function(els, attr, distance) {
        [].slice.call(els).forEach(item => {
            if (item) {
                item.style.width = (attr.width - distance) + "px";
            }
        })
    }

    DraggableBox.prototype.eMove = function(els, attr, distance) {
        [].slice.call(els).forEach(item => {
            if (item) {
                item.style.width = (attr.width + distance) + "px";
            }
        })
    }

    /**
     * 鼠标左键弹起事件
     */
    DraggableBox.prototype.mouseUpEvent = function() {
        if (this.dragInfo != null) {
            this.itemWidthHeight = this.allItemWidthHeight();
            typeof this.change === 'function' ? this.change(this) : '';

            this.dragInfo = null;

            // 拖动结束，去除遮罩
            [].slice.call(document.getElementsByClassName(this.itemClassName)).forEach(item => {
                item.classList.toggle(this.itemMoveClassName);
            })
        }
    }

    DraggableBox.prototype.allItemWidthHeight = function() {
        let el = this.el;
        if (!el) return [];

        let rowItems = null;
        let widthHeight = {
            width: [],
            height: []
        };

        let firstRowItems = el.firstElementChild && el.firstElementChild.children ? el.firstElementChild.children : [];
        [].slice.call(firstRowItems).forEach(item => {
            let width = parseInt(item.style.width);
            widthHeight.width.push(width);
        });

        [].slice.call(el.children).forEach(group => {
            let item = group.firstElementChild;
            if (!item) return;
            let height = parseInt(item.style.height);
            widthHeight.height.push(height);
        })

        return widthHeight;
    }

    return DraggableBox;
})();