/* global require, module, __dirname */
const path = require("path");

module.exports = {
	mode: "development",
	entry: "./src/zotero-moment-o7.js",
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: "ts-loader",
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"],
		alias: {
			"@services": path.resolve(__dirname, "src/services/"),
			"@memento": path.resolve(__dirname, "src/memento/"),
			"@preferences": path.resolve(__dirname, "src/preferences/"),
			"@webapi": path.resolve(__dirname, "src/webapi/"),
			"@types": path.resolve(__dirname, "src/types/")
		}
	},
	output: {
		filename: "zotero-moment-o7.js",
		path: path.resolve(__dirname, "build"),
		iife: true
	},
	externals: {
		// Zotero is provided by the environment
		"zotero": "commonjs zotero"
	},
	devtool: "source-map"
};