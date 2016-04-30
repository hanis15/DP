var NetTMap_setting = (function () {
    var graph_instance;

    // vrati instanci konkretniho typu, nebo vytvori novou
    function create() {
        graph_instance = new geoSetting();
        return graph_instance;
    }

    return {
        getInstance: function () {
            if (graph_instance == null)
                graph_instance = create();
            return graph_instance;
        }
    };
})();


function geoSetting() {
    

    var nodes = []; // seznam vsech uzlu
    var links = []; // seznam vsech linek mezi uzly
    var current_link_index;
    var speed_table = {};

    this.initialize = init;
    this.add_node = insert_node;
    this.add_link = insert_link;
    this.create_geojson_file = create_file;
    this.delete_node = delete_node;
    this.delete_link = delete_link;
    this.prepopulation_list_sensor = prepopulation_list;
    this.save_local_variable = save_local_variable;
    this.load_local_variable = load_local_variable;
    this.update = update_all;
    
    this.init_sensor_form = init_sensor_form;
    this.add_sensor = insert_sensor;

    function update_all() {
        load_local_variable();
        update_table_link();
        update_table_node();
    }

    function init_local_variables() {
        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            sessionStorage.nodes = "";
            sessionStorage.links = "";
            sessionStorage.curr_link_index = "";
        } else {
            alert("Local storage isn't support");
        }

    }

    function load_local_variable() {
        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            nodes = jQuery.parseJSON(sessionStorage.nodes);
            links = jQuery.parseJSON(sessionStorage.links);
        } else {
            alert("Local storage isn't support");
        }
    }

    function save_local_variable() {
        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            sessionStorage.nodes = JSON.stringify(nodes);
            sessionStorage.links = JSON.stringify(links);
        } else {
            alert("Local storage isn't support");
        }

    }














}