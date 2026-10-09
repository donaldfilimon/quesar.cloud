import { registerPlugin } from "@capacitor/core";

export interface CloudKitPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  getAccountStatus(): Promise<{ status: string }>;
}

const web: CloudKitPlugin = {
  async isAvailable() {
    return { available: false };
  },
  async getAccountStatus() {
    return { status: "couldNotDetermine" };
  },
};

export const CloudKit = registerPlugin<CloudKitPlugin>("CloudKit", { web: async () => web });
