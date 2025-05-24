// Quick test - paste this in Tools → Developer → Run JavaScript

// Check if plugin loaded
if (typeof Zotero.MomentO7 === 'undefined') {
    return "❌ Plugin NOT loaded";
} else {
    console.log("✅ Plugin loaded successfully!");
    console.log("Version:", Zotero.MomentO7.version);
    console.log("Plugin ID:", Zotero.MomentO7.id);
    
    // Check menu
    var menu = document.getElementById('zotero-moment-o7-menu');
    console.log("Menu exists:", menu !== null);
    
    // Check if we can access IaPusher
    console.log("IaPusher available:", typeof Zotero.IaPusher !== 'undefined');
    
    return "✅ Plugin is loaded and ready! Check console for details.";
}