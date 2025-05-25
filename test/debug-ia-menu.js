// Debug Internet Archive menu item
// Run this in Zotero's JavaScript console

(function debugIA() {
    console.clear();
    console.log("=== Debugging Internet Archive Menu ===\n");
    
    // 1. Check if plugin is loaded
    console.log("1. Plugin loaded:", !!Zotero.MomentO7);
    console.log("2. IaPusher loaded:", !!Zotero.IaPusher);
    
    if (!Zotero.IaPusher) {
        console.error("❌ IaPusher module not loaded!");
        return;
    }
    
    // 2. Check if sendReq exists
    console.log("3. sendReq exists:", typeof Zotero.IaPusher.sendReq);
    
    // 3. Check menu items
    const doc = Zotero.getMainWindow().document;
    const iaMenuItem = doc.getElementById("zotero-moment-o7-ia");
    console.log("4. IA menu item found:", !!iaMenuItem);
    
    if (iaMenuItem) {
        console.log("   - Label:", iaMenuItem.getAttribute("label"));
        console.log("   - ID:", iaMenuItem.id);
    }
    
    // 4. Check selected items
    const items = Zotero.getActiveZoteroPane().getSelectedItems();
    console.log("5. Selected items:", items.length);
    
    if (items.length > 0) {
        console.log("   First item:");
        console.log("   - Title:", items[0].getField("title"));
        console.log("   - URL:", items[0].getField("url"));
    }
    
    // 5. Try calling sendReq directly
    console.log("\n--- Testing Direct Call ---");
    console.log("Calling Zotero.IaPusher.sendReq() directly...");
    
    try {
        // Add extra logging to IaPusher temporarily
        const originalLog = Zotero.debug;
        Zotero.debug = function(msg) {
            console.log("[DEBUG]", msg);
            originalLog.call(Zotero, msg);
        };
        
        // Call the function
        Zotero.IaPusher.sendReq().then(() => {
            console.log("✅ sendReq completed");
            Zotero.debug = originalLog;
        }).catch(error => {
            console.error("❌ sendReq error:", error);
            console.error("Stack:", error.stack);
            Zotero.debug = originalLog;
        });
        
    } catch (error) {
        console.error("❌ Error calling sendReq:", error);
        console.error("Stack:", error.stack);
    }
    
    // 6. Check for any error in console
    console.log("\n--- Check Error Console ---");
    console.log("Look in Tools → Developer → Error Console for any errors");
    
    return "Debug info complete";
})();