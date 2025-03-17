import crypto from 'node:crypto';

export interface SignatureParams {
  [key: string]: string | number | boolean;
}

export interface GenerateSignatureOptions {
  secretKey: string;
  app_id: string | number;
  params: SignatureParams;
  user_id: string | number;
  ts: string | number;
}

export interface CheckRequestSignatureOptions extends GenerateSignatureOptions {
  signature: string;
}

export const sortParams = (params: SignatureParams): string => {
  return Buffer.from(
    Object.entries(params)
      .sort(([key1], [key2]) => key1.localeCompare(key2))
      .map(([key, value]) => `${key}_${encodeURIComponent(String(value))}`)
      .join(";")
  ).toString('base64')
  .replace(/=/g, "");
};

export const generateSignature = ({
  secretKey,
  app_id,
  params,
  user_id,
  ts,
}: GenerateSignatureOptions): string => {
  const newParams = { ...params };
  const request_id = sortParams(newParams);
  const innerParams = `app_id=${app_id}&request_id=${request_id}&ts=${ts}&user_id=${user_id}`;

  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(innerParams);
  const signature = hmac.digest('base64');

  return signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const checkRequestSignature = ({
  signature,
  secretKey,
  app_id,
  params,
  user_id,
  ts,
}: CheckRequestSignatureOptions): boolean => {
  const generatedSignature = generateSignature({
    secretKey,
    app_id,
    params,
    user_id,
    ts,
  });

  return signature === generatedSignature;
};

export default checkRequestSignature;
