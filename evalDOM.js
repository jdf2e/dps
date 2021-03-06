module.exports = function evalDOM() {
  let agrs = arguments;
  if(!agrs.length) agrs = {length: 1, 0: {}};
  let agrs0 = agrs[0];
  
  let option = [];
  let backgroundColor;
  let animation;

  if(agrs.length === 1 && getArgtype(agrs0) === 'object') {
    option = [
      getArgtype(agrs0.init) === 'function'? agrs0.init: noop,
      getArgtype(agrs0.includeElement) === 'function'? agrs0.includeElement: noop,
      agrs0.background || '#ecf0f2',
      agrs0.animation
    ];
  }else{
    option = parseParams(arguments);
  }
  backgroundColor = option[2];
  animation = option[3];

  const blocks = [];
  const win_w = window.innerWidth;
  const win_h = window.innerHeight;
  
  function drawBlock({width, height, top, left, zIndex = 9999999, background, radius} = {}) {
    const styles = [
      'position: fixed',
      'z-index: '+zIndex,
      'top: '+top+'%',
      'left: '+left+'%',
      'width: '+width+'%',
      'height: '+height+'%',
      'background: '+(background || backgroundColor)
    ];
    radius && radius != '0px' && styles.push('border-radius: '+radius);
    animation && styles.push('animation: '+animation);
    blocks.push(`<div style="${styles.join(';')}"></div>`);
  }

  function noop() {}

  function getArgtype(arg){
    return Object.prototype.toString.call(arg).toLowerCase().match(/\s(\w+)/)[1];
  }

  function getStyle(node, attr) {
    return (node.nodeType === 1? getComputedStyle(node)[attr]: '') || '';
  }
  

  function DrawPageframe(opts) {
    this.rootNode = opts.rootNode || document.body;
    this.offsetTop = opts.offsetTop || 0;
    this.includeElement = opts.includeElement;
    this.init = opts.init;

    this.originStyle = {};

    return this instanceof DrawPageframe? this: new DrawPageframe(opts); 
  }

  function wPercent(x) {
    return parseFloat(x/win_w*100).toFixed(3);
  }

  function hPercent(x) {
    return parseFloat(x/win_h*100).toFixed(3);
  }

  function includeElement(elements, node) {
    return ~elements.indexOf((node.tagName || '').toLowerCase());
  }

  function isHideStyle(node) {
    return getStyle(node, 'display') === 'none' || 
        getStyle(node, 'visibility') === 'hidden' || 
        getStyle(node, 'opacity') == 0 ||
        node.hidden;
  }

  function isCustomCardBlock(node) {
    let bgStyle = getStyle(node, 'background');
    let bgColorReg = /rgba\([\s\S]+?0\)/ig;
    let bdReg = /(0px)|(none)/;
    let hasBgColor = !bgColorReg.test(bgStyle) || ~bgStyle.indexOf('gradient');
    let hasNoBorder = ['top', 'left', 'right', 'bottom'].some(item => {
      return bdReg.test(getStyle(node, 'border-'+item));
    });
    let rect = node.getBoundingClientRect();
    let { width: w, height: h } = rect;
    let customCardBlock = !!(hasBgColor && (!hasNoBorder || getStyle(node, 'box-shadow') != 'none') && w > 0 && h > 0 && w < 0.95*win_w && h < 0.3*win_h);
    return customCardBlock;
  }

  DrawPageframe.prototype = {
    resetDOM: function() {
      this.init && this.init();

      this.originStyle = {
        scrollTop: window.scrollY,
        bodyOverflow: getStyle(document.body, 'overflow')
      };

      window.scrollTo(0, this.offsetTop);
      document.body.style.overflow = 'hidden!important';

      drawBlock({
        width: 100, 
        height: 100, 
        top: 0, 
        left: 0, 
        zIndex: 9999990,
        background: '#fff'
      });
    },
    showBlocks: function() {
      if(blocks.length) {
        // const { body } = document;
        // const blocksHTML = blocks.join('');
        // const div = document.createElement('div');
        // div.innerHTML = blocksHTML;
        // body.appendChild(div);
        // return blocksHTML;
        window.scrollTo(0, this.originStyle.scrollTop);
        document.body.style.overflow = this.originStyle.bodyOverflow;
      }
    },

    startDraw: function() {
      let $this = this;
      this.resetDOM();
      const nodes = this.rootNode.childNodes;
      
      function deepFindTextNode(nodes) {
        if(nodes.length) {
          for(let i = 0; i < nodes.length; i++) {
            
            let node = nodes[i];
            if(isHideStyle(node) || (getArgtype($this.includeElement) === 'function' && $this.includeElement(node, drawBlock) == false)) continue;
            let childNodes = node.childNodes;
            let hasChildText = false;
            let background = getStyle(node, 'backgroundImage');
            let backgroundHasurl = background.match(/url\(.+?\)/);
            
            backgroundHasurl = backgroundHasurl && backgroundHasurl.length;

            for(let j = 0; j < childNodes.length; j++) {
              if(childNodes[j].nodeType === 3 && childNodes[j].textContent.trim().length) {
                hasChildText = true;
                break;
              }
            }

            if((node.nodeType === 3 && node.textContent.trim().length) || 
              includeElement(['img', 'input', 'button', 'textarea', 'svg', 'canvas', 'video', 'audio'], node) || 
              backgroundHasurl ||
              hasChildText ||
              isCustomCardBlock(node)) {
                let rect = node.getBoundingClientRect();
                let { top: t, left: l, width: w, height: h } = rect;
                
                if(w > 0 && h > 0 && l >= 0 && l < win_w && t < win_h - 100 && t >= 0 && h < win_h/2) {
                  let paddingTop = parseInt(getStyle(node, 'paddingTop'));
                  let paddingLeft = parseInt(getStyle(node, 'paddingLeft'));
                  let paddingBottom = parseInt(getStyle(node, 'paddingBottom'));
                  let paddingRight = parseInt(getStyle(node, 'paddingRight'));
                  drawBlock({
                    width: wPercent(rect.width - paddingLeft - paddingRight), 
                    height: hPercent(rect.height - paddingTop - paddingBottom), 
                    top: hPercent(rect.top + paddingTop), 
                    left: wPercent(rect.left + paddingLeft),
                    radius: getStyle(node, 'border-radius')
                  });
                }
            }else if(childNodes && childNodes.length) {
              if(!hasChildText) {
                deepFindTextNode(childNodes);
              }
            }
          }
        }
      }

      deepFindTextNode(nodes);
      return this.showBlocks();
    }
  }

  function parseParams(params) {
    let options = [];
    if(params.length) {
      for(let i in [0, 1]) {
        let fn = eval('(' + params[i] + ')');
        if(fn) {
          options[i] = fn;
        }
      }
      options[2] = params[2];
      options[3] = params[3];
    }
    return options;
  }
  return new Promise((resolve, reject) => {   
    setTimeout(() => {
      try{
        const html = new DrawPageframe({
          init: option[0],
          includeElement: option[1]
        }).startDraw();
        resolve(html);
      }catch(e) {
        reject(e);
      }
    }, 1000);
  }); 

}

// 待优化：
// 1. table
// 2. 文字
