// JavaScript source code

function geo_Leaflet_graph(id, width, height) {
    var mymap;
    var zoom;
    var nodes = [];
    var links = [];
    var current_type;
    var current_item_index;
    this.create_map = load_graph;
    this.set_center = nastav_stred;
    this.set_data = nacti_data;

    function load_local_variable() {
        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            nodes = jQuery.parseJSON(sessionStorage.nodes);
            links = jQuery.parseJSON(sessionStorage.links);
            current_item_index = sessionStorage.current_item_index;
            current_type = sessionStorage.current_type;
        } else {
            alert("Local storage isn't support");
        }
    }

    function save_local_variable() {
        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            sessionStorage.nodes = JSON.stringify(nodes);
            sessionStorage.links = JSON.stringify(links);
            sessionStorage.current_type = current_type;
            sessionStorage.current_item_index = current_item_index;
        } else {
            alert("Local storage isn't support");
        }

    }

    // definovani css style
    function define_style() {
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = ".ui-tooltip, .qtip{"
                        + "position: absolute;"
                        + "left: -28000px;"
                        + "top: -28000px;"
                        + "display: none;"
                        + "max-width: 900px;"
                        + "min-width: 600px;"
                        + "font-size: 10.5px;"
                        + "line-height: 12px;"
                        + "}";
        document.getElementsByTagName('head')[0].appendChild(style);
    }

    function nacti_data(data) {
        var json_data = jQuery.parseJSON(data);

        mymap.remove();
        new_map(json_data);
    }

    // nastavi stred mapy
    function nastav_stred(value) {
        mymap.remove();
        if (value == 'cz') {
            zoom = 7;
            d3.json("json/cz_city.geo.json", parse_data);
        }
        else {
            zoom = 13;
            d3.json("json/brno_school.geo.json", parse_data);
        }
    }

    // vytvori mapu
    function load_graph() {
        define_style();

        // nastaveni velikosti
        $("#" + id).height(height);
        $("#" + id).width(width);
        
        zoom = 7;
        error = null;
        d3.json("json/test.geo.json", parse_data);
    }

    function parse_data(error, data) {
        if (error) throw error;
        
        new_map(data);
    }

    function new_map(data) {
        var x_data = [];
        var y_data = [];
        nodes = [];
        links = [];
        for (var count = 0; count < data.features.length; count++) {
            if (data.features[count].geometry.type == "Point") {
                nodes.push(data.features[count].properties);
                x_data.push(data.features[count].geometry.coordinates[0]);
                y_data.push(data.features[count].geometry.coordinates[1]);
            }
            else
                links.push(data.features[count].properties);
        }

        // zobrazeni mapy s ohledem na souradnice bodu
        mymap = L.map(id).setView([d3.median(y_data), d3.median(x_data)], zoom);

        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mymap);

        var myStyle1 = {
            "weight": "4",
            "color": "#6f00ff",
            "opacity": "1"
        };

        var myStyle2 = {
            "weight": "6",
            "color": "#66cdaa",
            "opacity": "1"
        };
        var myStyle3 = {
            "weight": "8",
            "color": "#ffff66",
            "opacity": "1"
        };
        var myStyle4 = {
            "weight": "10",
            "color": "#ff4444",
            "opacity": "1"
        };
        var myStyle5 = {
            "weight": "12",
            "color": "#000000",
            "opacity": "1"
        };

        var geoJsonLayer = L.geoJson(data.features, {
            pointToLayer: function (feature, latlng) {
                var smallIcon = L.icon({
                    iconSize: [30, 30],
                    className: "node",
                    iconUrl: (feature.properties.type_node == "R") ? "img/router.png" : "img/sensor.png"
                });

                return L.marker(latlng, { icon: smallIcon });
            },
            style: function (feature, latlng) {
                if (feature.geometry.type == "LineString") {
                    switch (feature.properties.speed) {
                        case "100": return myStyle1;
                        case "1000": return myStyle2;
                        case "10000": return myStyle3;
                        case "40000": return myStyle4;
                        case "100000": return myStyle5;
                    }
                }
            },
            onEachFeature: function (feature, layer) {
                var myPopup = L.popup({
                    maxWidth: 640,
                    minWidth: 600,

                }).setContent('<iframe height="180" width="640" src="template/data.html" />');

                var popup = layer.bindPopup(myPopup);

                if (feature.geometry.type == "LineString") {
                    current_type = 'L';
                    for (var count = 0; count < links.length; count++) {
                        if (feature.properties.name == links[count].name) {
                            current_item_index = count;
                            break;
                        }
                    }
                }
                else {
                    current_type = 'N';
                    for (var count = 0; count < nodes.length; count++) {
                        if (feature.properties.name == nodes[count].name) {
                            current_item_index = count;
                            break;
                        }
                    }
                }

                //layer.bindLabel(current_type + '_' + current_item_index);


                return layer;
            }
        }).addTo(mymap);

        mymap.on("popupclose", function (e) {
            //alert("close");
            load_local_variable();
        });

        mymap.on("popupopen", function (e) {
            //alert("open");
            // najdu odpovidajici linku pro aktualni feature
            save_local_variable();
        });

    }
}