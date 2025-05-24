// Zotero Moment-o7 Test Script
// Run this in Tools → Developer → Run JavaScript

// Test 1: Check if plugin is loaded
console.log("=== Testing Zotero Moment-o7 ===");
console.log("Plugin loaded:", typeof Zotero.MomentO7 !== 'undefined');

if (typeof Zotero.MomentO7 !== 'undefined') {
    console.log("Version:", Zotero.MomentO7.version);
    console.log("Initialized:", Zotero.MomentO7.initialized);
    console.log("Notifier ID:", Zotero.MomentO7.notifierID);
}

// Test 2: Check if IaPusher is loaded
console.log("\nIaPusher loaded:", typeof Zotero.IaPusher !== 'undefined');

// Test 3: Check if Signpost is loaded
console.log("Signpost loaded:", typeof Zotero.Signpost !== 'undefined');

// Test 4: Test URL validation
if (typeof Zotero.IaPusher !== 'undefined') {
    console.log("\n=== Testing URL Validation ===");
    console.log("Valid HTTP:", Zotero.IaPusher.checkValidUrl("http://example.com"));
    console.log("Valid HTTPS:", Zotero.IaPusher.checkValidUrl("https://example.com"));
    console.log("Invalid:", Zotero.IaPusher.checkValidUrl("not-a-url"));
    console.log("Empty:", Zotero.IaPusher.checkValidUrl(""));
}

// Test 5: Check selected items
console.log("\n=== Selected Items ===");
var items = Zotero.getActiveZoteroPane().getSelectedItems();
console.log("Selected items count:", items.length);

if (items.length > 0) {
    var item = items[0];
    console.log("First item title:", item.getField('title'));
    console.log("First item URL:", item.getField('url'));
    console.log("Is archived:", Zotero.IaPusher.isArchived(item));
    
    // Test 6: Test archiving (uncomment to actually archive)
    // console.log("\n=== Testing Archive Function ===");
    // console.log("Starting archive...");
    // await Zotero.IaPusher.archiveItem(item);
    // console.log("Archive complete!");
}

// Test 7: Check menu items
console.log("\n=== Checking Menu Items ===");
var win = Zotero.getMainWindow();
var menuSeparator = win.document.getElementById('zotero-moment-o7-separator');
var menuMain = win.document.getElementById('zotero-moment-o7-menu');
var menuIA = win.document.getElementById('zotero-moment-o7-ia');

console.log("Menu separator exists:", menuSeparator !== null);
console.log("Main menu exists:", menuMain !== null);
console.log("IA menu item exists:", menuIA !== null);

console.log("\n=== Test Complete ===");
return "All tests completed. Check console for results.";