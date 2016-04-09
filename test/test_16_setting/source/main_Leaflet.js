// JavaScript source code

function geo_Leaflet_graph(id, width, height) {
    var mymap;
    var zoom;
    this.create_map = load_graph;
    this.set_center = nastav_stred;
    this.set_data = nacti_data;

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
        d3.json("json/cz_city.geo.json", parse_data);
    }

    function parse_data(error, data) {
        if (error) throw error;
        
        new_map(data);
    }

    function new_map(data) {
        var x_data = [];
        var y_data = [];
        for (var count = 0; count < data.features.length; count++) {
            if (data.features[count].geometry.type == "Point") {
                x_data.push(data.features[count].geometry.coordinates[0]);
                y_data.push(data.features[count].geometry.coordinates[1]);
            }
        }

        // zobrazeni mapy s ohledem na souradnice bodu
        mymap = L.map(id).setView([d3.median(y_data), d3.median(x_data)], zoom);

        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mymap);


        // zobrazeni geoJSON objektu na mape
        var geojsonMarkerOptions = {
            radius: 10,
            fillColor: "red",
            color: "black",
            weight: 1
        };

        L.geoJson(data.features, {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, geojsonMarkerOptions);
            }
        }).addTo(mymap);
    }
}