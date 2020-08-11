# Draggable Box
边框可拖动的网格。可配置项：容器宽高、边框粗细、边框颜色、边框样式、盒子外边距

# 参数说明

## 配置属性

| Key | Type | Default | Aside |
|----|:----:|:----:|----|
| el | DOMNode | null | 容器节点 |
| width　| number | 400 |　容器的宽度 |
| height| number | 300 | 容器的高度 |
| rows | number | 2 | 行数。当autoRender为true时，生效。 |
| cols | number | 2 | 列数。当autoRender为true时，生效。 |
| itemMinWidth | number | 0 | 网格中盒子的最小宽度 |
| itemMinHeight | number | 0 | 网格中盒子的最小高度 |
| itemBorderWidth | number | 0 | 网格中盒子的边框宽度 |
| itemBorderColor | string | #ccc | 网格中盒子的边框的颜色 |
| itemBorderStyle | string | solid | 网格中盒子的边框样式 |
| itemMargin | number | 0 | 网格中盒子的外边距 |
| itemWidthHeight | object | { width: [], height: [] } | 记录网格，每行的行高、每列的列宽 |
| allowDrag | boolean | true | 边框是否允许拖动，默认允许 |
| autoRender | boolean　| true | 默认自动渲染容器里的元素。为false时，使用el中的节点，不再自动渲染 |
| noOuterBorder | boolean | true | 无最外层的边框，默认无 |
| change | function | null | 容器重新渲染时的回调事件，参数为this |

## 输出属性

| Key | Type | Aside |
|----|:----:|:----:|
| percent | number | 已缩放的比例 |

# [Demo演示](https://codepen.io/swlws/pen/VwavYNb)

```html
<div id="drag-wrap-box">
    <div>
        <div></div>
        <div></div>
        <div></div>
    </div>
    <div>
        <div></div>
        <div></div>
        <div></div>
    </div>
</div>
```
new DraggableBox({
        el: document.getElementById('drag-wrap-box'),
        width: 800,
        height: 400,
        allowDrag: true,
        autoRender: false,
        noOuterBorder: false,
        itemMinWidth: 40,
        itemMinHeight: 40,
        itemBorderWidth: 1,
        itemBorderColor: 'red',
        itemMargin: 0,
        itemWidthHeight:{
            width:[10,10,10],
            height:[10,10]
        },
        change: function(itemWidthHeight) {
            console.log(this, itemWidthHeight)
        }
    });
```js

```
