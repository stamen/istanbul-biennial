'use strict';

var fs                = require('fs'),
    xml2js            = require('xml2js'),
    SphericalMercator = require('sphericalmercator'),
    out;

var parser = new xml2js.Parser();

var merc = new SphericalMercator({
    size: 256
});

fs.readFile(__dirname + '/data/simpledb-dump-20141714-15-06.xml', function(err, data) {

    if (err) {
      console.error(err);
    }

    parser.parseString(data, function (err, result) {

        if (err) {
          console.error(err);
        }

        var newArray = result.SelectResponse.SelectResult[0].Item.map(function(a) {
          out = {};

          //
          // Format the object
          //
          for (var i=0 in a.Attribute) {
            if (a.Attribute[i].Name[0] === 'provider_str') {

              out['provider_str'] = a.Attribute[i].Value[0];
              
            } else if(a.Attribute[i].Name[0] === 'center') {
              out['center'] = a.Attribute[i].Value[0].split(':');
            } else if(a.Attribute[i].Name[0] === 'zoom') {
              out['zoom'] = a.Attribute[i].Value[0];
            }

          }

          return out;
        });

        //
        // Get sphearical mercator coords
        //
        newArray.map(function(item) {
            item['center_merc'] = merc.px([item.center[1], item.center[0]], item.zoom).map(function(v) {return parseInt(v/256, 10)});
            item['center_merc_world'] = merc.px([item.center[1], item.center[0]], 2).map(function(v) {return parseInt(v/256, 10)});
            return item;
        });

        //
        // Cluster the points in tiles
        //
        var clusters = {};

        newArray.forEach(function(map) {
          var id = map['center_merc_world'][0] + ':' + map['center_merc_world'][1];
          
          if (!clusters[id]) {
            clusters[id] = [];
          }

          clusters[id].push(map);
        });

        fs.writeFile('./data/groupedByTile.js', JSON.stringify(clusters), {'encoding':'utf8'}, function() {
          console.log('Done');
        });

    });
});