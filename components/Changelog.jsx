import React, { Component, PropTypes } from 'react'
import {VERSION} from 'knex'
import List from './List'
import marked from 'marked'

const renderer = new marked.Renderer()

renderer.paragraph = function(text) {
  return text
}

function mark(content) {
  return marked(content.replace(/#(\d+)/g, function(match, d) {
    return ` [${match}](https://github.com/tgriesser/knex/issues/${d})`
  }), {renderer})
}

export default class Changelog extends Component {

  static propTypes = {
    content: PropTypes.arrayOf(
      PropTypes.shape({
        date: PropTypes.string.isRequired,
        version: PropTypes.string.isRequired,
        changes: PropTypes.arrayOf(
          PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.shape({
              title: PropTypes.string,
              items: PropTypes.arrayOf(PropTypes.string)
            })
          ])
        ).isRequired
      })
    ).isRequired
  };

  state = {
    showFull: false
  };

  componentWillMount() {
    this.changes = prepareChangelog(this.props.content)
  }

  handleShowFull = (e) => {
    e.preventDefault()
    this.setState({showFull: true})
  };

  renderLog = ({more, version, date, changes}) => {
    let changeItems

    if (more) {
      return (
        <div key="more">
          <a href="#" onClick={this.handleShowFull}>Show Full Changelog</a>
          <div className="more-changelog">
            {more.map(this.renderLog)}
          </div>
        </div>
      )
    }

    function titledList(change) {
      return [
        <b key={`${version}-title`}>{change.title}</b>,
        <List key={`${version}-list`} content={change.items} marked={mark} />
      ]
    }

    if (changes.length === 1) {
      if (changes[0].title) {
        changeItems = titledList(changes[0])
      } else {
        changeItems = <p dangerouslySetInnerHTML={{__html: mark(changes[0])}} />
      }
    } else if (changes[0].title) {
      changeItems = changes.map(titledList)
    } else {
      changeItems = <List content={changes} marked={mark} />
    }

    return (
      <div key={version}>
        <b className="header">{version}</b> — <small><i>{date}</i></small><br />
        {changeItems}
      </div>
    )
  };

  render() {
    const {state: {showFull}, changes} = this
    let log = changes

    if (showFull) {
      if (changes[changes.length - 1].more) {
        log = changes.slice(0, -1).concat(changes[changes.length - 1].more)
      }
    }

    // Don't include unreleased changes
    const current = log.find(c => c.version === VERSION)
    const idx = log.indexOf(current)
    if (idx !== -1) {
      log = log.slice(idx)
    }

    return (
      <div id="changelog">
        {log.map(this.renderLog)}
      </div>
    )
  }
}

function prepareChangelog(changelog) {
  const [currentMajor, currentMinor] = VERSION.split('.')
  const list = []
  for (let i = 0; i < changelog.length; i++) {
    const current = changelog[i]
    const semver = current.version.split('.')
    if (semver.length !== 3) {
      list.push(current)
      continue
    }
    const [major, minor] = semver
    if (
      (currentMajor === '0' && currentMinor === minor) ||
      (currentMajor !== '0' && currentMajor === major)
    ) {
      list.push(current)
    } else {
      list.push({more: changelog.slice(i)})
      return list
    }
  }
  return list
}