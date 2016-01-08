var Episode = React.createClass({displayName: "Episode",
  render: function() {
    var p = this.props.path;
    var w = this.props.weave;
    
    var f = Unravel.Index.filament(p);
    var md = f.metadata(w);
    var body = f.data(w);
    
    return (
      React.createElement("article", {className: "episode", "data-weave": w}, 
        React.createElement("div", {className: "main"}, 
          React.createElement("header", {className: "info"}, 
            React.createElement("h1", {className: "title"}, md.title), 
            React.createElement("dl", null, 
              React.createElement("dt", null, "Season"), React.createElement("dd", {className: "season"}, md.season), 
              React.createElement("dt", null, "Episode"), React.createElement("dd", {className: "episode"}, md.episode), 
              React.createElement("dt", null, "Original Airdate:"), React.createElement("dd", {className: "airdate"}, md.airdate), 
              React.createElement("dt", null, "Director:"), React.createElement("dd", {className: "director"}, md.director)
            )
          ), 
          React.createElement("div", {className: "body", dangerouslySetInnerHTML: {__html: body}})
        )
      )
    );
  },
});

var EpisodeSelectorEpisode = React.createClass({displayName: "EpisodeSelectorEpisode",
  render: function() {
    var ep = this.props.episode;
    
    var klass = 'episode episode-' + ep.id;
    if (this.props.isCurrent) klass += " current";
    
    var md = ep.metadata(Unravel.Index.lastWeaveName());
    var title = [md.title, md.summary].join("\n\n");
    
    return (
      React.createElement("li", {key: ep.id, onClick: this.selectEpisode, className: klass, title: title}, 
        React.createElement("a", {href: '#' + ep.id}, 
          React.createElement("h3", null, 
            React.createElement("span", {className: "what"}, "e"), 
            React.createElement("span", {className: "number"}, ep.episode < 10 ? "0" + ep.episode : ep.episode)
          )
        )
      )
    );
  },
  selectEpisode: function(event) {
    event.preventDefault();
    
    var ep = this.props.episode;
    this.props.whenSelected(ep.id, ep);
  },
});

var EpisodeSelectorSeason = React.createClass({displayName: "EpisodeSelectorSeason",
  render: function() {
    var $this = this;
    return (
      React.createElement("li", {key: this.props.season, className: "season"}, 
        React.createElement("h2", null, 
          React.createElement("span", {className: "what"}, "s"), 
          React.createElement("span", {className: "number"}, "0", this.props.season)
        ), 
        React.createElement("ol", {className: "episodes"}, 
          $.map(this.props.episodes, function (e) {return $this.episodeLi(e)})
        )
      )
    );
  },
  episodeLi: function(ep) {
    var isCurrent = this.props.currentEp && this.props.currentEp.id == ep.id;
    return (
      React.createElement(EpisodeSelectorEpisode, {key: ep.id, episode: ep, isCurrent: isCurrent, whenSelected: this.props.whenSelected})
    );
  },
});

var EpisodeSelector = React.createClass({displayName: "EpisodeSelector",
  seasonLi: function(s, eps) {
    return (
      React.createElement(EpisodeSelectorSeason, {key: s, season: s, episodes: eps, currentEp: this.props.currentEp, whenSelected: this.props.whenSelected})
    );
  },
  sortedEpisodes: function() {
    return this.props.episodes.sort(function(a, b) {
      return a.id > b.id ? -1 : 1
    });
  },
  episodeListsBySeason: function() {
    var h = {};
    $.map(this.sortedEpisodes(), function(ep, ix) {
      h[ep.season] = h[ep.season] || [];
      h[ep.season].push(ep);
    });
    return h;
  },
  render: function() {
    var $this = this;
    if (this.props.header) var header = (React.createElement("h2", null, this.props.header));
    
    return (
      React.createElement("nav", {id: this.props.id, className: "episode-guide"}, 
        header, 
        React.createElement("ol", {className: "seasons"}, 
          $.map(this.episodeListsBySeason(), function(episodes, season) {
            return $this.seasonLi(season, episodes);
          }).reverse()
        )
      )
    );
  }
});

var EpisodeDisplay = React.createClass({displayName: "EpisodeDisplay",
  getInitialState: function() {
    var eps = Unravel.Index.episodes();
    var lastEp = eps[eps.length - 1];
    var selectedEp = this.getEpisodeFromFragment() || lastEp;
    
    return {
      currentEpisodeId: selectedEp.id,
      supportingDocs: {},
    };
  },
  getEpisodeFromFragment: function() {
    var hash = document.location.hash;
    var match = hash.match(/^#s(\d+)e(\d+)/);
    if (!match) return null;
    return Unravel.Index.episodes(function(ep) {
      return ep.season == Number(match[1]) && ep.episode == Number(match[2]);
    })[0];
  },
  selectEpisode: function(id) {
    this.setState({currentEpisodeId: id});
    $(document).scrollTop(0);
  },
  render: function() {
    var currentEp = Unravel.Index.episode(this.state.currentEpisodeId);
    return (
      React.createElement("div", {onClick: this.handleWeaveLink}, 
        React.createElement(EpisodeSelector, {id: "global-nav", whenSelected: this.selectEpisode, episodes: Unravel.Index.episodes(), currentEp: currentEp}), 
        React.createElement(Episode, {path: currentEp.path, weave: currentEp.id}), 
        React.createElement(SupportingDocumentList, {supportingDocs: this.state.supportingDocs[this.state.currentEpisodeId] || []})
      )
    )
  },
  handleWeaveLink: function(event) {
    var $this = $(event.target);
    if (!$this.is('a.weave-link')) return;
    
    event.preventDefault();
    event.stopPropagation();
  
    var href = $this.attr('href');
    var path = href.replace(/^:weave:\//, '');
    var m = path.match(Unravel.Episode.pathRegex);
    if (m) {
      this.selectEpisode(m[1]);
    } else {
      this.addSupportingDoc(path, $this);
    }
  },
  addSupportingDoc: function(path, pinnedTo) {
    var h = this.state.supportingDocs;
    var k = this.state.currentEpisodeId;
    var docs = h[k] || (h[k] = []);
    var doc = docs.find(function(doc) {return doc.path == path});
    var sel = this.selectorFor(pinnedTo);
    
    if (doc) {
      doc.pinnedToSelector = sel;
    } else {
      docs.push(doc = {
        path: path,
        pinnedToSelector: sel,
      });
    }
    
    this.forceUpdate();
  },
  selectorFor: function(el) {
    el = el[0] || el;
    var parts = [];
    while (el && el.tagName) {
      if (el.id) {
        parts.splice(0, 0, "#" + el.id);
        el = null;
      } else {
        var index = $(el.parentNode).children().index(el) + 1;
        index = index > 1 ? (':nth-child(' + index + ')') : '';
        parts.splice(0, 0, el.tagName.toLowerCase() + index);
        el = el.parentNode;
      }
    }
    return parts.join(" > ");
  },
});

var SupportingDocumentList = React.createClass({displayName: "SupportingDocumentList",
  componentWillMount: function() {
    $(window).on('resize', this.reposition);
  },
  render: function() {
    var supportingDocs = $.map(this.props.supportingDocs, function(d) {
      return (React.createElement(SupportingDocument, {key: d.path, path: d.path, pinnedToSelector: d.pinnedToSelector}))
    });
  
    return (
      React.createElement("section", {id: "supporting-documents"}, 
        supportingDocs
      )
    );
  },
  reposition: function() {
    this.forceUpdate();
  }
});

var SupportingDocument = React.createClass({displayName: "SupportingDocument",
  getInitialState: function() {
    var pinnedTo = $(this.props.pinnedToSelector);
    var pinnedToTop = pinnedTo ? pinnedTo.offset().top : 0;
    return {
      weave: Unravel.currentWeaveName(),
      x: 100,
      y: pinnedToTop - 100,
      z: ++zTopDoc,
      rotation: this.randomRotation(),
      tilt: 90,
    };
  },
  componentDidMount: function() {
    this.setState({tilt: 0});
    this.reposition();
  },
  componentWillReceiveProps: function(newProps) {
    this.reposition(newProps.pinnedToSelector);
    if (newProps.pinnedToSelector != this.props.pinnedToSelector) {
      this.setState({
        rotation: this.randomRotation(),
        z: ++zTopDoc,
      });
    }
  },
  randomRotation: function() {
    return ((Math.random() * 6) - 3)
  },
  doc: function() {
    return Unravel.Index.filament(this.props.path);
  },
  episodes: function(doc) {
    doc = doc || this.doc();
    return $.map(doc.versions(), function(_, id) {return Unravel.Index.episode(id)});
  },
  selectVersion: function(id) {
    this.setState({weave: id});
  },
  reposition: function(pinnedToSelector) {
    pinnedToSelector = pinnedToSelector || this.props.pinnedToSelector;
    var pinnedTo = $(pinnedToSelector);
    this.setState({
      x: 0,
      y: pinnedTo.offset().top,
    });
  },
  jumpForward: function() {
    this.setState({z: ++zTopDoc});
  },
  render: function() {
    var path = this.props.path;
    var weave = this.state.weave;

    var filament = Unravel.Index.filament(path);
    var body = filament.data(weave);
    var metadata = filament.metadata(weave);
    
    var imgSrc = metadata.image || ("images/generic/" + path.split("/")[0] + ".png");
    var eps = this.episodes();
    var currentEp = eps.find(function(ep) {return ep.id == weave});
    
    var transform = [
      'translateY(' + this.state.y + 'px)',
      'translateX(' + this.state.x + 'px)',
      'rotate(' + this.state.rotation + 'deg)',
      'rotateY(' + this.state.tilt + 'deg)',
    ].join(' ');
    var style = {transform: transform, WebkitTransform: transform, zIndex: this.state.z}; 
    
    var md = ['Status', 'Actor', 'Player'].map(function (key) {
      return [(React.createElement("dt", null, key)), (React.createElement("dd", null, metadata[key.toLowerCase()]))];
    });
    
    return (
      React.createElement("article", {className: "supporting-doc", style: style, onClick: this.jumpForward}, 
        React.createElement("div", {className: "image note"}, 
          React.createElement("img", {src: imgSrc})
        ), 
        React.createElement(EpisodeSelector, {header: "As of", whenSelected: this.selectVersion, episodes: eps, currentEp: currentEp}), 
        React.createElement("div", {className: "body"}, 
          React.createElement("h2", null, metadata.title), 
          React.createElement("dl", {className: "info"}, 
            md
          ), 
          React.createElement("div", {className: "content", dangerouslySetInnerHTML: {__html: body}})
        )
      )
    );
  }
});
