var zTopDoc = 1000;

function currentMilestone() {
  return $('article.episode').attr('data-milestone');
};

function getFileAtMilestone(path, milestone) {
  milestone = milestone || currentMilestone();
  
  var index = $(document).data('index');
  var pathData = index.elements[path];
  var atMilestone = pathData[milestone];
  while (atMilestone.see) {
    milestone = atMilestone.see;
    atMilestone = pathData[milestone];
  }
  return $.Deferred().resolve(atMilestone.data, atMilestone.metadata, milestone, pathData);
};

function showEpisode(path, milestone) {
  milestone = milestone || $('#global-nav').data('last-milestone-name');
  
  getFileAtMilestone(path, milestone).then(function(data, metadata) {
    var article = $('article.episode').attr('data-milestone', milestone);
    $.each(metadata, function (key, value) { article.find('.info .' + key).text(value) });
    article.find('.body').html(data);
    $('.supporting-doc').remove();
    $(document).scrollTop(0);
    Nav.setCurrent($('#global-nav'), path);
  });
};

function showArticle(path, milestone, pinnedTo) {
  var id = path.replace(/[.].*?$/, '').replace(/[^a-z0-9-]+/ig, '-');
  var doc = $('#' + id);
  
  if (doc.length == 0) {
    getFileAtMilestone(path, milestone).then(function(data, metadata, milestone, pathData) {
      var doc = $('<article/>').attr('id', id).attr('class', 'supporting-doc').attr('data-path', path);
      var imageNote = $('<div class="image note"/>')
        .appendTo(doc)
        .append($('<img/>').attr('src', metadata.image || ('images/generic/' + path.split('/')[0] + '.png')));
      var nav = $('<nav class="episode-guide"/>')
        .appendTo(doc)
        .append($("<h2/>").text('As of'));
      Nav.setVersions(nav, pathData, milestone);
      
      showArticle.setBody(doc, data, metadata);
      
      animateArticle(doc, pinnedTo);
    });
  } else {
    animateArticle(doc, pinnedTo);
  }
};
showArticle.setBody = function(doc, data, metadata) {
  var body = $('<div class="body"/>')
    .append($("<h2 class='title'/>").text(metadata.title))
    .append($("<dl class='info'/>"))
    .append(data);
  
  var info = function (key, value) {
    if (!value) return;
    
    var dl = body.find('dl.info');
    dl.append($('<dt/>').text(key)).append($('<dd/>').text(value));
  }
  info('Status', metadata.status);
  info('Actor', metadata.actor);
  info('Player', metadata.player);
  
  var oldBody = doc.find('.body');
  if (oldBody.length) {
    oldBody.replaceWith(body);
  } else {
    body.appendTo(doc);
  }
};

function animateArticle(doc, pinnedTo, options) {
  options = options || {};
  var keepRotation = options.keepRotation === true;
  var keepStackPositions = options.keepStackPositions === true;
  
  var transformToPositionAt = function(top, right, tilt) {
    var position = 'translateY(' + top + 'px)';
    if (right) position = position + ' translateX(' + right + 'px)';
    if (tilt) position = position + ' rotateY(' + tilt + 'deg)';
    var degrees = (keepRotation) ? doc.data('degrees') : ((Math.random() * 6) - 3);
    doc.data('degrees', degrees);
    var rotation = 'rotate(' + degrees + 'deg)';
    var t = [position, rotation].join(' ');
    doc.css({transform: t, webkitTransform: t});
  };
  
  doc.data('pinned-to', pinnedTo);
  var newHeight = pinnedTo.offset().top;
  
  if (doc.parent().length == 0) {
    transformToPositionAt(newHeight - 100, 600, 90);
    doc.appendTo($('#supporting-documents'));
  }

  if (!keepStackPositions) {
    doc.css({zIndex: ++zTopDoc});
  }
  setTimeout(function () {
    transformToPositionAt(newHeight);
  }, 100);
};

var Nav = {
  addSeason: function(nav, season) {
    var seasons = nav.find('ol.seasons');
    if (seasons.length == 0) seasons = $('<ol class="seasons"/>').appendTo(nav);
    var li = seasons.find('li.season[data-season=' + season + ']');
    if (li.length) return li;
    
    var li = $('<li class="season"/>')
      .attr('data-season', season);
    $('<h2/>')
      .append($('<span class="what"/>').text('s'))
      .append($('<span class="number"/>').text(season))
      .appendTo(li);
    $('<ol class="episodes"/>')
      .appendTo(li);
    li.appendTo(seasons);
    return li;
  },
  addEpisode: function(nav, season, episode) {
    var seasonEl = Nav.addSeason(nav, season);
    var li = seasonEl.find('li.episode[data-episode=' + episode + ']');
    if (li.length) return li;
    
    var li = $('<li class="episode"/>')
      .attr('data-season', season)
      .attr('data-episode', episode);
    $('<h3/>')
      .append($('<span class="what"/>').text('e'))
      .append($('<span class="number"/>').text(episode))
      .appendTo(li);
    li.appendTo(seasonEl.find('ol.episodes'));
    return li;
  },
  setCurrent: function(nav, season, episode) {
    nav.find('.current').removeClass('current');
    
    var epMatch = season.match(/s(\d+)e(\d+)/);
    if (epMatch) {
      season = epMatch[1];
      episode = epMatch[2];
    }
    
    var li = nav.find('li[data-season=' + season + '] li[data-episode=' + episode + ']');
    var see = li.attr('data-see-version');
    if (see) {
      Nav.setCurrent(nav, see);
    } else {
      li.addClass('current');
    }
  },
  episodeRegex: /episodes\/s(\d\d)e(\d\d)/,
  setMilestones: function(nav, milestones) {
    nav.data('milestones', milestones);
    nav.data('last-milestone-name', milestones[milestones.length-1].name);
  
    var episodes = milestones.reduce(function(eps, milestone) {
      return eps.concat(milestone.changed.filter(function(c) {
        return Nav.episodeRegex.test(c);
      }).map(function (path) {
        return {path: path, milestone: milestone.name};
      }));
    }, []).filter(function (item, ix, eps) {
      return eps.findIndex(function(i) { return i.path == item.path}) === ix;
    }).sort(function (a, b) {
      return b.path > a.path ? 1 : a.path > b.path ? -1 : 0;
    });
  
    episodes.forEach(function (ep) {
      var match = ep.path.match(Nav.episodeRegex);
      if (match) {
        var li = Nav.addEpisode(nav, match[1], match[2])
          .attr('data-path', ep.path)
          .attr('data-milestone', ep.milestone)
          .click(function (event) { showEpisode(ep.path, ep.milestone); });
      }
    });
    
    if (nav.attr('id') == 'global-nav') {showEpisode(episodes[0].path, episodes[0].milestone);}
  },
  setVersions: function(nav, versions, currentVersion) {
    versions = versions || {};
    var versionNames = $.map(versions, function(val,key) {return key}).sort(function (a,b) {return a > b ? -1 : 1});
    nav.data('versions', versionNames);
    nav.data('versionInfo', versions);
    
    $.each(versionNames, function() {
      var version = this;
      var versionInfo = versions[version];
      var match = version.match(/^s(\d+)e(\d+)$/);
      if (match) {
        var li = Nav.addEpisode(nav, match[1], match[2])
          .attr('data-version', version)
          .attr('data-see-version', versionInfo.see)
          .click(function (event) {
            var doc = $(event.target).closest('.supporting-doc');
            showArticle.setBody(doc, versionInfo.data, versionInfo.metadata);
            Nav.setCurrent(nav, match[1], match[2]);
          });
      }
    });
    
    Nav.setCurrent(nav, currentVersion || versionNames[0]);
    
    return nav;
  },
};

$(document).on('click', "a.milestone-link", function (event) {
  event.preventDefault();
  
  var $this = $(this);
  var href = $this.attr('href');
  var path = href.replace(/^:milestone:\//, '');
  if (/episodes\//.test(path)) {
    showEpisode(path);
  } else {
    showArticle(path, null, $this);
  }
});

$(document).on('click', '#supporting-documents article', function () {
  $(this).css({zIndex: zTopDoc++});
});

$(window).on('resize', function () {
  $('article.supporting-doc').each(function () {
    var $this = $(this);
    var pinnedTo = $this.data('pinned-to');
    animateArticle($this, pinnedTo, {keepRotation: true, keepStackPositions: true});
  });
});

$(function () {
  return $.get('index.json').then(function (data) {
    if (typeof(data) == "string") {data = JSON.parse(data);}
    
    $(document).data('index', data);
    
    var globalNav = $('#global-nav');
    Nav.setMilestones(globalNav, data.milestones);
  });
});
