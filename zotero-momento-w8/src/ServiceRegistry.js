if (typeof Zotero === "undefined") {
	// var Zotero;
}

Zotero.MomentoW8.ServiceRegistry = {
	services: new Map(),

	init: function () {
		this.services.clear();
	},

	register: function (serviceId, service) {
		if (!serviceId || !service) {
			throw new Error("ServiceRegistry: serviceId and service are required");
		}

		if (!service.isAvailable || !service.archive || !service.getMenuLabel) {
			throw new Error("ServiceRegistry: service must implement BaseArchiveService interface");
		}

		this.services.set(serviceId, service);
		Zotero.debug(`MomentoW8: Registered service ${serviceId}`);
	},

	unregister: function (serviceId) {
		this.services.delete(serviceId);
		Zotero.debug(`MomentoW8: Unregistered service ${serviceId}`);
	},

	get: function (serviceId) {
		return this.services.get(serviceId);
	},

	getAll: function () {
		return Array.from(this.services.values());
	},

	getAvailable: async function () {
		const available = [];
		for (const [id, service] of this.services) {
			try {
				if (await service.isAvailable()) {
					available.push({ id, service });
				}
			} catch (e) {
				Zotero.debug(`MomentoW8: Error checking availability for ${id}: ${e}`);
			}
		}
		return available;
	},

	getMenuItems: async function () {
		const available = await this.getAvailable();
		return available.map(({ id, service }) => ({
			id: `momento-w8-${id}`,
			label: service.getMenuLabel(),
			command: () => service.archive()
		}));
	}
};