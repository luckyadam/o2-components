/**
 * 基于o2_base的lazyload组件
 * 参考:https://github.com/jasonslyvia/react-lazyload/
 */
const DELAY_TPYE_THROTTLE = 'throttle'
const DELAY_TPYE_DEBOUNCE = 'debounce'
const LISTEN_FLAG = 'data-lazyload-listened'

let components = []
let onceComponents = []
let lastLazyLoadHandler = null
let resizeLazyHandler = null
let delayType = DELAY_TPYE_THROTTLE
const defaultBoundingClientRect = { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 }

class LazyLoad extends Base.Component {
  constructor () {
    super(...arguments)
    this.visible = false
  }

  componentDidMount () {
    const w = window
    const props = this.props
    const { throttle, debounce, overflow, scroll, resize } = props
    let needResetLazyHandler = false
    let delayTime = 300
    if (typeof throttle !== undefined && delayType !== DELAY_TPYE_THROTTLE) {
      needResetLazyHandler = true
      delayType = DELAY_TPYE_THROTTLE
      delayTime = throttle >>> 0
    } else if (typeof debounce !== undefined && delayType !== DELAY_TPYE_DEBOUNCE) {
      needResetLazyHandler = true
      delayType = DELAY_TPYE_DEBOUNCE
      delayTime = debounce >>> 0
    }
    if (needResetLazyHandler) {
      w.removeEventListener('scroll', lastLazyLoadHandler)
      w.removeEventListener('resize', resizeLazyHandler)
      lastLazyLoadHandler = null
      resizeLazyHandler = null
    }
    if (!lastLazyLoadHandler) {
      lastLazyLoadHandler = Base.Util[delayType](lazyLoadHandler, delayTime)
    }
    let parent
    if (overflow) {
      parent = getScrollParent(this.dom)
    }
    if (parent && parent!== window) {
      if (parent.getAttribute) {
        const listenerCount = 1 + parent.getAttribute(LISTEN_FLAG) | 0
        if (listenerCount === 1) {
          parent.addEventListener('scroll', lastLazyLoadHandler)
        }
        parent.setAttribute(LISTEN_FLAG, listenerCount)
      }
    } else if (components.length === 0 || needResetLazyHandler) {
      if (scroll) {
        w.addEventListener('scroll', lastLazyLoadHandler)
      }
      if (resize) {
        let winSize = getWinSize()
        let winWidth = winSize.width
        let winHeight = winSize.height
        let resizeTimeout = null
        resizeLazyHandler = function () {
          let winSize = getWinSize()
          let winNewWidth = winSize.width
          let winNewHeight = winSize.height
          if(winWidth !== winNewWidth || winHeight !== winNewHeight){
            resizeTimeout && clearTimeout(resizeTimeout)
            resizeTimeout = setTimeout(lastLazyLoadHandler, 0)
          }
          winWidth = winNewWidth
          winHeight = winNewHeight
        }
        w.addEventListener('resize', resizeLazyHandler)
      }
    }

    components.push(this)
    checkVisible(this)
  }

  shouldComponentUpdate () {
    return this.visible
  }

  componentWillUnmount () {
    const w = window
    if (this.props.overflow) {
      const parent = getScrollParent(this.dom)
      if (parent && parent.getAttribute) {
        const listenerCount = parent.getAttribute(LISTEN_FLAG) | 0 - 1
        if (listenerCount === 0) {
          parent.removeEventListener('scroll', lastLazyLoadHandler)
          parent.removeAttribute(LISTEN_FLAG)
        } else {
          parent.setAttribute(LISTEN_FLAG, listenerCount)
        }
      }
    }
    const index = components.indexOf(this)
    if (index >= 0) {
      components.splice(index, 1)
    }
    if (components.length === 0) {
      w.removeEventListener('scroll', lastLazyLoadHandler)
      w.removeEventListener('scroll', lastLazyLoadHandler)
    }
  }

  render () {
    const { children, placeholder, placeholderClassName, height } = this.props
    if (this.visible) {
      return children
    }
    if (placeholder && placeholder.type === 'Widget') {
      return placeholder
    }
    return <div className={placeholderClassName} style={{height: height}}></div>
  }
}

function getWinSize () {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight
  }
}

function lazyLoadHandler () {
  components.forEach(component => checkVisible(component))
  clearOnce()
}

function clearOnce () {
  onceComponents.forEach(component => {
    const index = components.indexOf(component)
    if (index >= 0) {
      components.splice(index, 1)
    }
  })
  onceComponents = []
}

function checkVisible (component) {
  const domNode = component.dom
  if (!domNode) {
    return
  }
  let parent
  let visible
  if (component.props.overflow) {
    parent = getScrollParent(domNode)
  }
  if (parent && parent !== window) {
    visible = checkOverflowVisible(component, parent)
  } else {
    visible = checkNormalVisible(component)
  }
  if (visible) {
    if (!component.visible) {
      if (component.props.once) {
        onceComponents.push(component)
      }
      component.visible = true
      component.forceUpdate()
    }
  } else if (!(component.props.once && component.visible)) {
    component.visible = false
    if (component.props.unmountIfInvisible) {
      component.forceUpdate()
    }
  }
}

function checkOverflowVisible (component, parent) {
  const domNode = component.dom
  let parentTop
  let parentHeight

  try {
    ({ top: parentTop, height: parentHeight } = parent.getBoundingClientRect())
  } catch (e) {
    ({ top: parentTop, height: parentHeight } = defaultBoundingClientRect)
  }

  const windowInnerHeight = getWinSize().height
  const intersectionTop = Math.max(parentTop, 0)
  const intersectionHeight = Math.min(windowInnerHeight, parentTop + parentHeight) - intersectionTop
  let top
  let height
  try {
    ({ top, height } = domNode.getBoundingClientRect());
  } catch (e) {
    ({ top, height } = defaultBoundingClientRect);
  }
  const offsetTop = top - intersectionTop
  const offsets = Array.isArray(component.props.offset) ? component.props.offset : [component.props.offset | 0, component.props.offset | 0]
  return (offsetTop - offsets[0] <= intersectionHeight) && (offsetTop + height + offsets[1] >= 0)
}

function checkNormalVisible (component) {
  const domNode = component.dom
  if (!(domNode.offsetWidth || domNode.offsetHeight || domNode.getClientRects().length)) {
    return false
  }
  let top
  let elementHeight
  try {
    ({ top, height: elementHeight } = domNode.getBoundingClientRect())
  } catch (e) {
    ({ top, height: elementHeight } = defaultBoundingClientRect)
  }
  const windowInnerHeight = getWinSize().height
  const offsets = Array.isArray(component.props.offset) ? component.props.offset : [component.props.offset | 0, component.props.offset | 0]
  return (top - offsets[0] <= windowInnerHeight) && (top + elementHeight + offsets[1] >= 0)
}

function getScrollParent (domNode) {
  if (!domNode || !(domNode.nodeType === 1 && domNode.nodeName)) {
    return window
  }
  let parent = domNode
  const overflowRegex = /(scroll|auto)/
  while (parent) {
    if (!domNode.parentNode) {
      return window
    }
    let { overflow } = style = getStyle(parent)
    let overflowX = style['overflow-x']
    let overflowY = style['overflow-y']
    if (overflowRegex.test(overflow) && overflowRegex.test(overflowX) && overflowRegex.test(overflowY)) {
      return parent
    }

    parent = parent.parentNode
  }
  return window
}

function getStyle (domNode) {
  if (Base.Util.isNative(window.getComputedStyle)) {
    return window.getComputedStyle(domNode, null)
  }
  return domNode.currentStyle
}

LazyLoad.defaultProps = {
  once: false,
  throttle: 300,
  offset: 0,
  scroll: true,
  resize: true,
  unmountIfInvisible: false,
  placeholderClassName: 'mod_lazyload_placeholder'  
}