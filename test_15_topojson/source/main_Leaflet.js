// JavaScript source code

function geo_Leaflet_graph(id, width, height) {
    this.create_map = load_graph;
    this.set_center = nastav_stred;
    this.set_data = nacti_data;

    function nacti_data(data) {
        var json_data = jQuery.parseJSON(data);

    }

    // nastavi stred mapy
    function nastav_stred(value) {
        if (value == 'cz') {

        }
    }

    // vytvori mapu
    function load_graph() {
        
        d3.json("json/brno_school.geo.json", parse_data);
    }

    function parse_data(error, data) {
        if (error) throw error;
        
        var x_data = [];
        var y_data = [];
        for (var count = 0; count < data.features.length; count++) {
            if (data.features[count].geometry.type == "Point") {
                x_data.push(data.features[count].geometry.coordinates[0]);
                y_data.push(data.features[count].geometry.coordinates[1]);
            }
        }

        // zobrazeni mapy s ohledem na souradnice bodu
        var mymap = L.map(id).setView([d3.median(y_data), d3.median(x_data)], 13);

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