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
    let ComponentClass = this.state.ComponentClass
    if (ComponentClass) {
      return <ComponentClass id={this.props.id} dataSource={this.props.dataSource} />
    }
    return <div style={{ height: this.props.height }} />
  }
}