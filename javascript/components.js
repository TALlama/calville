'use strict';

var Episode = React.createClass({
  render: function render() {
    var md = this.metadata();
    var body = this.data();

    return React.createElement(
      'article',
      { className: 'episode', 'data-weave': this.props.weave },
      React.createElement(
        'div',
        { className: 'main' },
        React.createElement(
          'header',
          { className: 'info' },
          React.createElement(
            'h1',
            { className: 'title' },
            md.title
          ),
          React.createElement(
            'dl',
            null,
            React.createElement(
              'dt',
              null,
              'Season'
            ),
            React.createElement(
              'dd',
              { className: 'season' },
              md.season
            ),
            React.createElement(
              'dt',
              null,
              'Episode'
            ),
            React.createElement(
              'dd',
              { className: 'episode' },
              md.episode
            ),
            React.createElement(
              'dt',
              null,
              'Original Airdate:'
            ),
            React.createElement(
              'dd',
              { className: 'airdate' },
              md.airdate
            ),
            React.createElement(
              'dt',
              null,
              'Director:'
            ),
            React.createElement(
              'dd',
              { className: 'director' },
              md.director
            )
          )
        ),
        React.createElement('div', { className: 'body', dangerouslySetInnerHTML: { __html: body } })
      )
    );
  },
  filament: function filament() {
    return Unravel.Index.filament(this.props.path);
  },
  metadata: function metadata() {
    return this.filament().metadata(this.props.weave);
  },
  data: function data() {
    return this.filament().data(this.props.weave);
  },
  componentDidMount: function componentDidMount() {
    this.scrollToCurrentLocation();

    $(document).on('popstate', function (event) {});
  },
  componentDidUpdate: function componentDidUpdate(oldProps, oldState) {
    this.scrollToCurrentLocation();
  },
  scrollToCurrentLocation: function scrollToCurrentLocation() {
    if (Number(this.props.scene) < 1) return;

    $('article.episode .current').removeClass('current');

    var slug = $('article.episode h2').eq(Number(this.props.scene) - 1);
    slug.addClass('current');
    var scrollTo = slug;

    if (Number(this.props.line) > 0) {
      var line = slug.nextUntil('h2').eq(Number(this.props.line) - 1);
      line.addClass('current');
      scrollTo = line;
    }

    $(document).scrollTop(scrollTo.offset().top - 50);
  }
});

var EpisodeSelectorEpisode = React.createClass({
  render: function render() {
    var ep = this.props.episode;

    var klass = 'episode episode-' + ep.id;
    if (this.props.isCurrent) klass += " current";

    var md = ep.metadata(Unravel.Index.lastWeaveName());
    var title = [md.title, md.summary].join("\n\n");

    return React.createElement(
      'li',
      { key: ep.id, onClick: this.selectEpisode, className: klass, title: title },
      React.createElement(
        'a',
        { href: '#' + ep.id },
        React.createElement(
          'h3',
          null,
          React.createElement(
            'span',
            { className: 'what' },
            'e'
          ),
          React.createElement(
            'span',
            { className: 'number' },
            ep.episode < 10 ? "0" + ep.episode : ep.episode
          )
        )
      )
    );
  },
  selectEpisode: function selectEpisode(event) {
    event.preventDefault();

    var ep = this.props.episode;
    this.props.whenSelected(ep.id, ep);
  }
});

var EpisodeSelectorSeason = React.createClass({
  render: function render() {
    var $this = this;
    return React.createElement(
      'li',
      { key: this.props.season, className: 'season' },
      React.createElement(
        'h2',
        null,
        React.createElement(
          'span',
          { className: 'what' },
          's'
        ),
        React.createElement(
          'span',
          { className: 'number' },
          '0',
          this.props.season
        )
      ),
      React.createElement(
        'ol',
        { className: 'episodes' },
        $.map(this.props.episodes, function (e) {
          return $this.episodeLi(e);
        })
      )
    );
  },
  episodeLi: function episodeLi(ep) {
    var isCurrent = this.props.currentEp && this.props.currentEp.id == ep.id;
    return React.createElement(EpisodeSelectorEpisode, { key: ep.id, episode: ep, isCurrent: isCurrent, whenSelected: this.props.whenSelected });
  }
});

var EpisodeSelector = React.createClass({
  seasonLi: function seasonLi(s, eps) {
    return React.createElement(EpisodeSelectorSeason, { key: s, season: s, episodes: eps, currentEp: this.props.currentEp, whenSelected: this.props.whenSelected });
  },
  sortedEpisodes: function sortedEpisodes() {
    return this.props.episodes.sort(function (a, b) {
      return a.id > b.id ? -1 : 1;
    });
  },
  episodeListsBySeason: function episodeListsBySeason() {
    var h = {};
    $.map(this.sortedEpisodes(), function (ep, ix) {
      h[ep.season] = h[ep.season] || [];
      h[ep.season].push(ep);
    });
    return h;
  },
  render: function render() {
    var $this = this;
    if (this.props.header) var header = React.createElement(
      'h2',
      null,
      this.props.header
    );

    return React.createElement(
      'nav',
      { id: this.props.id, className: 'episode-guide' },
      header,
      React.createElement(
        'ol',
        { className: 'seasons' },
        $.map(this.episodeListsBySeason(), function (episodes, season) {
          return $this.seasonLi(season, episodes);
        }).reverse()
      )
    );
  }
});

var EpisodeDisplay = React.createClass({
  getInitialState: function getInitialState() {
    var eps = Unravel.Index.episodes();

    return $.extend({
      currentEpisodeId: eps[eps.length - 1].id,
      currentScene: 0,
      currentLine: 0,
      supportingDocs: {}
    }, this.getInitialStateFromFragment());
  },
  getInitialStateFromFragment: function getInitialStateFromFragment() {
    var hash = document.location.hash;
    var match = hash.match(/^#s(\d+)e(\d+)(?:s(\d+)l(\d+))/);

    var state = {};
    if (!match) return state;

    var ep = Unravel.Index.episodes(function (ep) {
      return ep.season == Number(match[1]) && ep.episode == Number(match[2]);
    })[0];
    if (ep) state.currentEpisodeId = ep.id;
    if (match[3]) state.currentScene = Number(match[3]);
    if (match[4]) state.currentLine = Number(match[4]);

    return state;
  },
  selectEpisode: function selectEpisode(id, scene, line) {
    this.setState({ currentEpisodeId: id, currentScene: Number(scene), currentLine: Number(line) });
    $(document).scrollTop(0);
  },
  render: function render() {
    var currentEp = Unravel.Index.episode(this.state.currentEpisodeId);
    return React.createElement(
      'div',
      { onClick: this.handleWeaveLink },
      React.createElement(EpisodeSelector, { id: 'global-nav', whenSelected: this.selectEpisode, episodes: Unravel.Index.episodes(), currentEp: currentEp }),
      React.createElement(Episode, { path: currentEp.path, weave: currentEp.id, scene: this.state.currentScene, line: this.state.currentLine }),
      React.createElement(SupportingDocumentList, { supportingDocs: this.state.supportingDocs[this.state.currentEpisodeId] || [] })
    );
  },
  componentDidMount: function componentDidMount() {
    this.recordLocation();

    var display = this;
    $(window).on('popstate', function (e) {
      var state = e && e.originalEvent && e.originalEvent.state;
      if (!state) return;

      console.log(state);
      display.props.recordLocations = false;
      display.setState(state);
      delete display.props.recordLocations;
    });
  },
  componentDidUpdate: function componentDidUpdate(oldProps, oldState) {
    this.recordLocation();
  },
  recordLocation: function recordLocation() {
    if (this.props.recordLocations === false) return;

    history.pushState(this.state, '', this.urlForLocation(this.state));
  },
  urlForLocation: function urlForLocation(state) {
    return [document.location.href.replace(/#.*/, ''), '#', state.currentEpisodeId, 's', state.currentScene, 'l', state.currentLine].join('');
  },
  handleWeaveLink: function handleWeaveLink(event) {
    var $this = $(event.target);
    if (!$this.is('a.weave-link')) return this.selectLine($this);

    event.preventDefault();
    event.stopPropagation();

    var href = $this.attr('href');
    var path = href.replace(/^:weave:\//, '');
    var m = path.match(Unravel.Episode.pathRegex);
    if (m) {
      this.selectEpisode(m[1], m[4], m[5]);
    } else {
      this.addSupportingDoc(path, $this);
    }
  },
  selectLine: function selectLine(element) {
    var line = element.closest('dl, p.action, h1, h2, h3, h4, h5, h6');
    if (line.length == 0) return;

    var lineNumber = line.prevUntil('h2').length + 1;
    var sceneNumber = line.prevAll('h2').length;
    this.setState({ currentScene: sceneNumber, currentLine: lineNumber });
  },
  addSupportingDoc: function addSupportingDoc(path, pinnedTo) {
    var h = this.state.supportingDocs;
    var k = this.state.currentEpisodeId;
    var docs = h[k] || (h[k] = []);
    var doc = docs.find(function (doc) {
      return doc.path == path;
    });
    var sel = this.selectorFor(pinnedTo);

    if (doc) {
      doc.pinnedToSelector = sel;
    } else {
      docs.push(doc = {
        path: path,
        pinnedToSelector: sel
      });
    }

    this.forceUpdate();
  },
  selectorFor: function selectorFor(el) {
    el = el[0] || el;
    var parts = [];
    while (el && el.tagName) {
      if (el.id) {
        parts.splice(0, 0, "#" + el.id);
        el = null;
      } else {
        var index = $(el.parentNode).children().index(el) + 1;
        index = index > 1 ? ':nth-child(' + index + ')' : '';
        parts.splice(0, 0, el.tagName.toLowerCase() + index);
        el = el.parentNode;
      }
    }
    return parts.join(" > ");
  }
});

var SupportingDocumentList = React.createClass({
  componentWillMount: function componentWillMount() {
    $(window).on('resize', this.reposition);
  },
  render: function render() {
    var supportingDocs = $.map(this.props.supportingDocs, function (d) {
      return React.createElement(SupportingDocument, { key: d.path, path: d.path, pinnedToSelector: d.pinnedToSelector });
    });

    return React.createElement(
      'section',
      { id: 'supporting-documents' },
      supportingDocs
    );
  },
  reposition: function reposition() {
    this.forceUpdate();
  }
});

var SupportingDocument = React.createClass({
  getInitialState: function getInitialState() {
    var pinnedTo = $(this.props.pinnedToSelector);
    var pinnedToTop = pinnedTo ? pinnedTo.offset().top : 0;
    return {
      weave: Unravel.currentWeaveName(),
      x: 100,
      y: pinnedToTop - 100,
      z: ++zTopDoc,
      rotation: this.randomRotation(),
      tilt: 90
    };
  },
  componentDidMount: function componentDidMount() {
    this.setState({ tilt: 0 });
    this.reposition();
  },
  componentWillReceiveProps: function componentWillReceiveProps(newProps) {
    this.reposition(newProps.pinnedToSelector);
    if (newProps.pinnedToSelector != this.props.pinnedToSelector) {
      this.setState({
        rotation: this.randomRotation(),
        z: ++zTopDoc
      });
    }
  },
  randomRotation: function randomRotation() {
    return Math.random() * 6 - 3;
  },
  doc: function doc() {
    return Unravel.Index.filament(this.props.path);
  },
  episodes: function episodes(doc) {
    doc = doc || this.doc();
    return $.map(doc.versions(), function (_, id) {
      return Unravel.Index.episode(id);
    });
  },
  selectVersion: function selectVersion(id) {
    this.setState({ weave: id });
  },
  reposition: function reposition(pinnedToSelector) {
    pinnedToSelector = pinnedToSelector || this.props.pinnedToSelector;
    var pinnedTo = $(pinnedToSelector);
    this.setState({
      x: 0,
      y: pinnedTo.offset().top
    });
  },
  jumpForward: function jumpForward() {
    this.setState({ z: ++zTopDoc });
  },
  render: function render() {
    var path = this.props.path;
    var weave = this.state.weave;

    var filament = Unravel.Index.filament(path);
    var body = filament.data(weave);
    var metadata = filament.metadata(weave);

    var imgSrc = metadata.image || "images/generic/" + path.split("/")[0] + ".png";
    var eps = this.episodes();
    var currentEp = eps.find(function (ep) {
      return ep.id == weave;
    });

    var transform = ['translateY(' + this.state.y + 'px)', 'translateX(' + this.state.x + 'px)', 'rotate(' + this.state.rotation + 'deg)', 'rotateY(' + this.state.tilt + 'deg)'].join(' ');
    var style = { transform: transform, WebkitTransform: transform, zIndex: this.state.z };

    var md = ['Status', 'Actor', 'Player'].map(function (key) {
      var value = metadata[key.toLowerCase()];
      return value ? [React.createElement(
        'dt',
        null,
        key
      ), React.createElement(
        'dd',
        null,
        value
      )] : null;
    }).filter(function (item) {
      return item;
    });

    return React.createElement(
      'article',
      { className: 'supporting-doc', style: style, onClick: this.jumpForward },
      React.createElement(
        'div',
        { className: 'image note' },
        React.createElement('img', { src: imgSrc })
      ),
      React.createElement(EpisodeSelector, { header: 'As of', whenSelected: this.selectVersion, episodes: eps, currentEp: currentEp }),
      React.createElement(
        'div',
        { className: 'body' },
        React.createElement(
          'h2',
          null,
          metadata.title
        ),
        React.createElement(
          'dl',
          { className: 'info' },
          md
        ),
        React.createElement('div', { className: 'content', dangerouslySetInnerHTML: { __html: body } })
      )
    );
  }
});