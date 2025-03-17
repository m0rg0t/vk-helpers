import bridge from "@vkontakte/vk-bridge";

type TParamsForHashing = Record<string, string>;

const sortParams = (params: TParamsForHashing) => {
    return btoa(
      Object.entries(params)
        .sort(([key1], [key2]) => key1.localeCompare(key2))
        .map(([key, value]) => `${key}_${encodeURIComponent(value)}`)
        .join(";")
    ).replaceAll("=", "");
  };
  
  /**
   * Get hash from VK Bridge for secure API calls
   * @param {Object} params - Parameters to include in the hash
   * @returns {Promise<{sign: string, ts: number}>} Signature and timestamp
   */
  export const getHashForParamsFromVK = async (params: TParamsForHashing) => {
    const paramsString = sortParams(params);
    const outSignature = {
      sign: "",
      ts: 0,
    };
    
    try {
      const data = await bridge.send("VKWebAppCreateHash", {
        payload: paramsString,
      });
      outSignature.sign = data.sign;
      outSignature.ts = data.ts;
    } catch (error) {
      console.error("Error getting hash:", error);
      throw error;
    }
    
    return outSignature;
  };