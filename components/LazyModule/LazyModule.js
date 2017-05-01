/**
 * 基于o2_base的模块懒加载组件
 */

class LazyModule extends Base.Component {
  constructor () {
    super(...arguments)
  }

  componentDidMount () {
    const modulePath = this.props.modulePath
    Base.Module.use(modulePath, (ComponentClass) => {
      this.setState({
        ComponentClass
      })
    })
  }

  render () {
    const { placeholder, placeholderClassName, height } = this.props
    let ComponentClass = this.state.ComponentClass
    if (ComponentClass) {
      return <ComponentClass id={this.props.id} dataSource={this.props.dataSource} />
    }
    if (placeholder && placeholder.type === 'Widget') {
      return placeholder
    }
    return <div className={placeholderClassName} style={{height: height}}></div>
  }
}

LazyModule.defaultProps = {
  placeholder: null,
  placeholderClassName: 'mod_lazyload_placeholder'  
}