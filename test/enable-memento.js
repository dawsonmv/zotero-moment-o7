// Quick script to enable MementoChecker for testing
// This shows what needs to be uncommented in the plugin

console.log("To enable MementoChecker:\n");

console.log("1. Edit src/zotero-moment-o7.js");
console.log("2. Find these lines (around line 30):");
console.log("   // Future services (uncomment to enable)");
console.log("   // Services.scriptloader.loadSubScript(rootURI + 'src/MementoChecker.js');");
console.log("\n3. Remove the // to uncomment:");
console.log("   Services.scriptloader.loadSubScript(rootURI + 'src/MementoChecker.js');");
console.log("\n4. Rebuild the plugin: npm run build");
console.log("5. Reinstall in Zotero");
console.log("\nAlternatively, for testing without rebuilding:");
console.log("You can use the API directly with test-memento-api-direct.js");

// Show current status
if (typeof Zotero !== 'undefined' && Zotero.MementoChecker) {
    console.log("\n✅ MementoChecker is currently ENABLED");
} else if (typeof Zotero !== 'undefined') {
    console.log("\n❌ MementoChecker is currently DISABLED");
} else {
    console.log("\n⚠️  Not running in Zotero context");
}