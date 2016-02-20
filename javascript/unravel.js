var Unravel = {
  currentWeaveName: function () {
    return $('article.episode').attr('data-weave') || Unravel.Index.lastWeaveName();
  },
  weaveLink: function (event, detail, sender, context) {
    var $this = $(event.target);
    if (!$this.is('a.weave-link')) return;
    
    event.preventDefault();
    
    var href = $this.attr('href');
    var path = href.replace(/^:weave:\//, '');
    var match = path.match(Unravel.Episode.pathRegex);
    if (match) {
      context.fire('episode-picked', {episode: match[1]});
    } else {
      context.fire('supporting-document-picked', {path: path, pin: $this});
    }
  }
};

Unravel.Filament = function(path, versions) {
  this.path = path;
  this._versions = versions;
  $.extend(this, this.metadata());
};
$.extend(Unravel.Filament.prototype, {
  versions: function () {
    return this._versions = this._versions || Unravel.Index.data().filaments[this.path];
  },
  version: function(weave) {
    weave = weave || Unravel.currentWeaveName();
    var v = this.versions()[weave];
    while (v.see) {v = this.versions()[v.see]};
    return v;
  },
  data: function(weave) {
    return this.version(weave).data;
  },
  metadata: function(weave) {
    return this.version(weave).metadata;
  },
  get: function (weave) {
    return $.Deferred().resolve(this.data(weave), this.metadata(weave), weave, this);
  }
});

Unravel.Episode = {
  pathRegex: /episodes\/(s(\d+)e(\d+))[^#]*(?:#s(\d+)(?:l(\d+))?)?/
};

Unravel.Index = {
  data: function () {
    if (arguments.length > 0) {
      return $(document).data('index', arguments[0]);
    } else {
      return $(document).data('index');
    }
  },
  lastWeave: function() {
    return Unravel.Index.data().weaves[0];
  },
  lastWeaveName: function() {
    return Unravel.Index.lastWeave().name;
  },
  allFilaments: function(that) {
    that = that || function(o) {return o};
    return $.map(Unravel.Index.data().filaments, function(versions, path) {
      var filament = Unravel.Index.filament(path, versions);
      if (that(filament)) return filament;
    });
  },
  episodes: function(that) {
    that = that || function(o) {return o};
    return Unravel.Index.allFilaments(function(ep) {
      var match = ep.path.match(Unravel.Episode.pathRegex);
      if (!match) return null;
      ep.id = 's' + match[2] + 'e' + match[3];
      if (that(ep)) return ep;
    });
  },
  episode: function(id) {
    return Unravel.Index.episodes(function(ep) {return ep.id == id})[0];
  },
  filament: function(path, versions) {
    this._filaments = this._filaments || {};
    return this._filaments[path] = (this._filaments[path] || new Unravel.Filament(path, versions));
  }
};

var zTopDoc = 1000;

$(function () {
  return $.get('index.json').then(function (data) {
    if (typeof(data) == "string") {data = JSON.parse(data);}
    
    Unravel.Index.data(data);
    
    React.initializeTouchEvents(true);
    React.render(
      React.createElement(EpisodeDisplay),
      document.querySelector('#app')
    );
  });
});
