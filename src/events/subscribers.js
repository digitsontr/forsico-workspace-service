const ServiceBusConnection = require('../config/serviceBus');

class WorkspaceEventSubscriber {
    constructor() {
        this.serviceBus = ServiceBusConnection.getInstance();
        this.subscriptionName = 'workspace-subscription';
    }

    async subscribe() {
        await this.subscribeToUserEvents();
        await this.subscribeToRoleEvents();
    }

    async subscribeToUserEvents() {
        const receiver = await this.serviceBus.createReceiver('user-events', this.subscriptionName);

        receiver.subscribe({
            processMessage: async (message) => {
                try {
                    const event = message.body;
                    await this.handleUserEvent(event);
                    await message.complete();
                } catch (error) {
                    console.error('Error processing user event:', error);
                    await message.abandon();
                }
            },
            processError: async (args) => {
                console.error('Error from user event subscription:', args.error);
            }
        });
    }

    async subscribeToRoleEvents() {
        const receiver = await this.serviceBus.createReceiver('role-events', this.subscriptionName);

        receiver.subscribe({
            processMessage: async (message) => {
                try {
                    const event = message.body;
                    await this.handleRoleEvent(event);
                    await message.complete();
                } catch (error) {
                    console.error('Error processing role event:', error);
                    await message.abandon();
                }
            },
            processError: async (args) => {
                console.error('Error from role event subscription:', args.error);
            }
        });
    }

    async handleUserEvent(event) {
        switch (event.type) {
            case 'user.deleted':
                await this.handleUserDeletion(event.data);
                break;
            case 'user.deactivated':
                await this.handleUserDeactivation(event.data);
                break;
        }
    }

    async handleRoleEvent(event) {
        switch (event.type) {
            case 'role.updated':
                await this.handleRoleUpdate(event.data);
                break;
        }
    }

    async handleUserDeletion(userData) {
        console.log('Handling user deletion:', userData);
    }

    async handleUserDeactivation(userData) {
        console.log('Handling user deactivation:', userData);
    }

    async handleRoleUpdate(roleData) {
        console.log('Handling role update:', roleData);
    }
}

module.exports = WorkspaceEventSubscriber; 