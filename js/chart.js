var width = 1000,
    height = 800;

var svg = d3.select("#Chart").append("svg")
  .attr("width", width)
  .attr("height", height);

var div = d3.select("#Chart").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

var originX = width / 2,
    originY = height / 2,
    innerCircleRadius = 210,
    outerCircleRadius = 350;

var RADtoDEG = 180 / Math.PI;

var group0 = 19, // n. teams in GROUP 0 (Methodology)
    group1 = 28; // n. teams in GROUP 1 (ONS)

var r = 28; // Team sphere radius

// Function to calculate each team coordinates
var teamGetPos = function(rad, circleRadius) {
  return [originX + ((circleRadius) * Math.sin(rad)),
          originY - ((circleRadius) * Math.cos(rad))]
};

// Randiants ranges
var innerRadRange = d3.range(0, Math.PI * 2, Math.PI * 2 / group0),
    outerRadRange = d3.range(0, Math.PI * 2, Math.PI * 2 / group1);

// Place two invisible arcs and text on top of them
var arc = d3.svg.arc()
  .outerRadius(function(d, i) {
    return i === 0 ? innerCircleRadius + 40 : outerCircleRadius + 40
  })
  .startAngle(0)
  .endAngle(Math.PI);

svg.selectAll(".arcs")
  .data(["METHODOLOGY DIVISIONS", "ONS"])
  .enter().append("path")
  .attr("class", "arcs")
  .attr("d", arc)
  .style("fill", "none")
  .attr("transform", "translate(500, 400)")
  .attr("id", function(d, i) { return "wavy" + i; });

svg.selectAll(".labels")
  .data(["METHODOLOGY DIVISIONS", "ONS"])
  .enter().append("text")
  .attr("dy", "0")
  .attr("class", "labels")
  .append("textPath") //append a textPath to the text element
  .attr("xlink:href", function(d, i) {
    return "#wavy" + i;
  }) //place the ID of the path here
  .style("text-anchor", "middle") //place the text halfway on the arc
  .attr("startOffset", "20%")
  .text(function(d) {
    return d;
  });

// Arrow shape
var originalTriangle = [
  { "x": 0, "y": -5, "s": 1 },
  { "x": 10, "y": 0, "s": 1 },
  { "x": 0, "y": 5, "s": 1 } ];

// Path interpolator
var lineFunction = d3.svg.line()
  .x(function(d) { return d.x * d.s; })
  .y(function(d) { return d.y * d.s; })
  .interpolate("linear");

//  Legend of the arrows in the description
var posArrows = [ { "x": 80, "y": 50, "name": "0.1 FTE", "line_stroke": 0.5, "marker": 1 },
                  { "x": 80, "y": 100, "name": "4 FTE", "line_stroke": 8, "marker": 2 },
                  { "x": 80, "y": 150, "name": "8 FTE", "line_stroke": 16, "marker": 3 }];


var legend = d3.select("#arrowLegend")
  .append("svg")
  .attr("width", 300)
  .attr("height", 300)
  .selectAll(".gsymbol")
  .data(posArrows)
  .enter()
  .append("g")
  .attr("class", "gsymbol");

legend
  .append("svg:line")
  .attr("class", "leglink")
  .attr("x1", 10)
  .attr("y1", function(d) { return d.y })
  .attr("x2", 80)
  .attr("y2", function(d) { return d.y })
  .attr("stroke-width", function(d) { return d.line_stroke });

legend
  .append("path")
  .attr("class", "marker")
  .attr("d", function(d) {
    originalTriangle.forEach(function(o) {
       o['s'] = d.marker;
    })
    return lineFunction(originalTriangle)
  })
  .attr("transform", function(d) {
     return "translate(" + [d.x, d.y] + ")";
  });

legend
    .append("text")
    .attr("class", "leglabels")
    .attr("x", 130)
    .attr("y", function(d) {
      return d.y + 4;
    })
    .text(function(d) {
      return d.name;
    });

d3.json("./data/graph.json", function(error, graph) {
  if (error) throw error;

  // Set fixed position of the teams on the two circles
  graph.nodes.forEach(function(node, i) {
    if (node.group === 0) {
      var rad = innerRadRange[i];
      node.pos = teamGetPos(rad, innerCircleRadius);
    }
    else {
      var rad = outerRadRange[i - group0];
      node.pos = teamGetPos(rad, outerCircleRadius);
    }
  });

  // FTE (arrows stroke) scale
  var minFTE = 0;
  var maxFTE = d3.max(graph.links, function(d) {
    return d.value;
  });

  var strokeScale = d3.scale.linear()
    .range([.5, 16])
    .domain([minFTE, maxFTE]);
  var markerScale = d3.scale.linear().domain([minFTE, maxFTE]).range([1, 3]),
      markerEndPoint = d3.scale.linear().domain([minFTE, maxFTE]).range([40, 60]);

  var force = d3.layout.force()
    .charge(-400)
    .linkDistance(300)
    .size([width, height])
    .links(graph.links)
    .nodes(graph.nodes)
    .on("tick", tick);

  // Place the links (arrows): g + path
  // Set initial opacity to 0
  var links = svg.selectAll(".link")
    .data(force.links())
    .enter()
    .append("g")
    .attr("class", function(d) {
      return "glink n" + d.source + " " + "n" + d.target
    })
    .style("opacity", 0);

  links.append("path")
    .attr("class", "link")
    .attr("stroke-width", function(d) {
      return strokeScale(d.value);
    });

  // Arrowhead: g + marker
  links.append("g")
    .attr("class", "gmarker")
    .append("path")
    .attr("class", "marker")
    .attr("d", function(d) {
      originalTriangle.forEach(function(o) {
        o['s'] = markerScale(d.value);
      })
      return lineFunction(originalTriangle);
    })
    .attr("transform", function(d) {
      graph.nodes.forEach(function(node, i) {
        if (node.id == d.source)
          nodePos = node.pos
      })
      return "translate(" + nodePos + ")";
    })
    .style("fill", "slategray");

  // Place the nodes (teams) : g + circle + text
  var nodes = svg.selectAll(".node")
    .data(force.nodes())
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("id", function(d) {
        return d.id
      });

  nodes.append("circle")
    .attr("class", function(d) {
      return d.group === 0 ? "internal" : "external"
    })
    .attr("r", r)
    .on("mouseover", handleMouseOver)
    .on("mouseout", handleMouseOut);;

  nodes.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "1")
    .text(function(d) {
      return d.name;
    })
    .attr("font-size", "12px")
    .call(wrap, r * 2)
    .style("fill", "white");


  // Move the nodes and arrows of the graph to the initail position
  force.start();

  // Add interactivity: handle mouse over the nodes
  function handleMouseOver(d) {
    // Animate the arrows: from the hoovered source node to target(s)
    svg.selectAll(".n" + d.id).style("opacity", 1).transition().duration(300).attrTween("stroke-dasharray", tweenDash);

    // Identify all the target nodes connected to the source node that is hoovered
    var ids = [d.id];
    graph.links.forEach(function(link) {
      if (link.source.id === d.id || link.target.id === d.id)
        ids.push(link.target.id, link.source.id);
    })
    // Make nodes that are not involved transparent (opacity:0.3)
    svg.selectAll(".node").transition().duration(300).style("opacity", function() {
      return ids.contains(+this.id) ? 1 : .3;
    });
    // Show tooltip label with details about the team (node) that is hoovered
    svg.selectAll(".labels").transition().duration(300).style("opacity", .2);
    div.transition()
      .duration(200)
      .style("opacity", .9);
    div.html("<p><strong>" + d.description + "</strong></p><p>" + d.head + "</p>")
      .style("left", (d3.event.pageX) + "px")
      .style("top", (d3.event.pageY - 28) + "px");
  }


  // Returns an attrTween for translating along the specified path element.
  function tweenDash() {

    var that = this;
    var arrow = d3.select(that).select(".marker");
    var line = d3.select(that).select(".link");
    // Get the length of the arrow and stop the arrow before arriving at the center of the sphere
    var diff = markerEndPoint(line.data()[0].value);
    var l = line.node().getTotalLength() - diff;
    var i = d3.interpolateString("0," + l, l + "," + l);
    var start = line.node().getPointAtLength(0);
    var startAngle = 0;

    return function(t) {

      var p = line.node().getPointAtLength(t * l);

      var dx = p.x - start.x, // delta X
          dy = p.y - start.y; // delta Y

      var rotAngle = Math.atan(dy / dx) * RADtoDEG;

      if (dx < 0) {
        rotAngle += 180;
      }

      // Avoid division by 0
      if (dx == 0) {
        rotAngle = startAngle;
      }

      arrow.attr("transform", "translate(" + p.x + "," + p.y + ") rotate(" + rotAngle + ")"); //move marker

      start.x = p.x;
      start.y = p.y;

      startAngle = rotAngle;

      return i(t);
    };
  }


});



function handleMouseOut(d) {
  // Hide arrows
  svg.selectAll(".n" + d.id).style("opacity", 0);

  // Set back all nodes opacity to 1
  svg.selectAll(".node").transition().duration(300).style("opacity", 1);

  // Vanish the tooltip
  svg.selectAll(".labels").transition().duration(300).style("opacity", 1);
  div.transition()
    .duration(500)
    .style("opacity", 0);
}



// Create the movement of the arrows
function tick() {
  svg.selectAll(".node")
    .attr("transform", function(d) {
      return "translate(" + d.pos + ")";
    });
  svg.selectAll(".link")
    .attr("d", function(d) {
      var dx = d.target.pos[0] - d.source.pos[0],
          dy = d.target.pos[1] - d.source.pos[1],
          dr = Math.sqrt(dx * dx + dy * dy);
      return "M" + d.source.pos[0] +
             "," + d.source.pos[1] +
             "A" + dr + "," + dr +
             " 0 0,1 " + d.target.pos[0] +
             "," + d.target.pos[1];
    });
}

//  From https://gist.github.com/mbostock/7555321
function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
      words = text.text().split(/\s+/).reverse(),
      word,
      line = [],
      lineNumber = 0,
      lineHeight = 0, // ems
      y = text.attr("y"),
      dy = parseFloat(text.attr("dy")),
      tspan = text.text(null).append("tspan")
        .attr("x", 0).attr("y", y)
        .attr("dy", 0 + "em");


    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan")
          .attr("x", 0).attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .text(word);
      }
    }
  });
}

// Extend array prototype
Array.prototype.contains = function(obj) {
  var i = this.length;
  while (i--) {
    if (this[i] === obj) {
      return true;
    }
  }
  return false;
}
