// JavaScript source code

function setting() {
    var nodes = []; // seznam vsech uzlu
    var links = []; // seznam vsech linek mezi uzly
    this.initialize = init;
    this.add_node = insert_node;
    this.add_link = insert_link;
    this.create_geojson_file = create_file;

    function init() {
        // formular pro vkladani uzlu
        table_form = d3.select("#my_setting").append("table");
        table_form.style("float", "left").attr("id", "input_form_node");
        // 0.radek
        table_form.append("tr").append("h3").text("Uzel");
        // 1.radek
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Name node: ")
                          .append("input").attr("id", "name_node").attr("type", 'text');

        // 2.radek
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Longitude: ")
                          .append("input").attr("id", "longitude").attr("type", 'text')

        // 3.radek
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Latitude: ")
                          .append("input").attr("id", "latitude").attr("type", 'text');

        // 4.radek
        table_form.append("tr").append("td").attr("align", "right").append("input").attr("type", "submit").attr("value", "Vlozit uzel").attr("onclick", 'add_to_node_table()');

        // formular pro vkladani linek
        table_form = d3.select("#my_setting").append("table")
        table_form.attr("id", "input_form_link");
        // 0.radek
        table_form.append("tr").append("h3").text("Linka");
        // 1.radek
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Source: ")
                  .append("select").attr("id", "source_list");

        // 2.radek
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Destination: ")
                  .append("select").attr("id", "destination_list");

        // 3.radek
        table_form.append("tr").attr("height", $('tr').eq(1).height()).append("td");

        // 4.radek 
        table_form.append("tr").append("td").attr("align", "right").append("input").attr("type", "submit").attr("value", "Vlozit linku").attr("onclick", 'add_to_link_table()');

        d3.select("#my_setting").append("hr")
        tables = d3.select("#my_setting").append("div");

        // tabulka pro zobrazeni uzlu
        title = tables
            .append("table")
            .attr("id", "node_setting_result")
            .style("float", "left")
            .style("margin-right", "1cm")
            .attr("border", "1")
            .attr("width", $("#input_form_node").width())
            .append("tbody")
            .append("tr");
        title.append("td").text("Name");
        title.append("td").text("Longitude");
        title.append("td").text("Latitude");

        // tabulka pro zobrazeni linek
        title_link = tables
             .append("table")
             .attr("id", "link_setting_result")
             .attr("border", "1")
             .attr("width", $("#input_form_link").width())
             .append("tbody")
             .append("tr");
        title_link.append("td").text("Source");
        title_link.append("td").text("Destination");

        // tlacitko pro vytvoreni exportu
        d3.select("#my_setting").append("hr");
        d3.select("#my_setting").append("div")
             .append("input").attr("type", "submit").attr("value", "Vytvor soubor").attr("onclick", "create_file()");
    }

    function insert_node() {
        name = document.getElementById("name_node").value;
        latitude = document.getElementById("latitude").value;
        longitude = document.getElementById("longitude").value;

        document.getElementById("name_node").value = "";
        document.getElementById("latitude").value = "";
        document.getElementById("longitude").value = "";

        node = { name: name, lat: latitude, long: longitude };
        nodes.push(node);

        $('#node_setting_result > tbody:last-child').append('<tr><td>' + name + '</td><td>' + longitude + '</td><td>' + latitude + '</td></tr>');

        update_list();
    }

    function insert_link() {
        source = document.getElementById("source_list").value;
        destination = document.getElementById("destination_list").value;

        document.getElementById("source_list").value = "";
        document.getElementById("destination_list").value = "";

        link = { source: source, dest: destination };
        links.push(link);

        $('#link_setting_result > tbody:last-child').append('<tr><td>' + source + '</td><td>' + destination + '</td></tr>');

    }

    function update_list() {
        source_list_box = d3.select("#source_list");

        source_list_box.selectAll("option").remove();
        source_list_box.append("option").attr("value", "").text("");
        for (count = 0; count < nodes.length; count++) {
            source_list_box.append("option").attr("value", nodes[count].name).text(nodes[count].name);
        }

        destination_list_box = d3.select("#destination_list");

        destination_list_box.selectAll("option").remove();
        destination_list_box.append("option").attr("value", "").text("");
        for (count = 0; count < nodes.length; count++) {
            destination_list_box.append("option").attr("value", nodes[count].name).text(nodes[count].name);
        }
    }

    function create_file() {
        alert("Vytvarim soubor...");
        content = '{ "type": "FeatureCollection", "features": ['; // start
        curr_node = "";
        for (count = 0; count < nodes.length; count++) {
            curr_node = '{ "geometry": { "type": "Point", "coordinates": [ ' + nodes[count].long + ', ' + nodes[count].lat + ' ]},';
            curr_node +=  '"properties": { "name": "' + nodes[count].name + '"},';
            curr_node += '"type": "Feature" }';
            if (count != nodes.length - 1) { curr_node += ',';}
        }
        content += curr_node;
        
        if (links.length != 0) { content += ','; }

        for (count = 0; count < lineks.length; count++) {
            curr_node = '{ "geometry": { "type": "LineString", "coordinates": []},';
            curr_node += '"properties": { "source": "' + links[count].source + '", "target": "' + links[count].dest + '"},';
            curr_node += '"type": "Feature" }';
            if (count != links[count].length - 1) { curr_node += ','; }
        }
        content += curr_node;
        content += ']}';    // end
        window.open('data:text/json;charset=utf-8,' + escape(content))
    }
}