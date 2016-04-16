// hlavni soubor

// singleton
var NetTMap = (function () {
    var instances = {
        map: null,      // Leaflet map + topo
        graph: null,    // D3.js
        setting: null   // formular pro nastaveni geoJson souboru
    };

    // vrati instanci konkretniho typu, nebo vytvori novou
    function create(type) {
        switch (type.toUpperCase()) {
            case "MAP": return new mapTopo();
            case "GRAPH": return new mapGraph();
            case "SETTING": return new geoSetting();
            default: return null;
        }
    }

    return {
        getInstance: function (type) {
            switch (type.toUpperCase()) {
                case "MAP":
                    if (instances.map == null)
                        instances.map = create(type);
                    return instances.map;
                case "GRAPH":
                    if (instances.graph == null)
                        instances.graph = create(type);
                    return instances.graph;
                case "SETTING":
                    if (instances.setting == null)
                        instances.setting = create(type);
                    return instances.setting;
                default: return null;
            }
        }
    };
})();