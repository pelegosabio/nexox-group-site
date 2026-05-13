function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return ((crc & 0xffff) >>> 0).toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

export function generatePixPayload({
  pixKey,
  amount,
  merchantName,
  merchantCity,
  txId,
}: {
  pixKey: string;
  amount: number;
  merchantName: string;
  merchantCity: string;
  txId: string;
}): string {
  const gui = tlv("00", "BR.GOV.BCB.PIX");
  const key = tlv("01", pixKey);
  const merchantAccountInfo = tlv("26", gui + key);

  const amountStr = amount.toFixed(2);

  const safeName = merchantName.substring(0, 25).toUpperCase();
  const safeCity = merchantCity.substring(0, 15).toUpperCase();
  const safeTxId = txId.substring(0, 25).replace(/[^a-zA-Z0-9]/g, "").padEnd(1, "0");

  const additionalData = tlv("62", tlv("05", safeTxId));

  const payload =
    tlv("00", "01") +
    tlv("01", "11") +
    merchantAccountInfo +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", amountStr) +
    tlv("58", "BR") +
    tlv("59", safeName) +
    tlv("60", safeCity) +
    additionalData +
    "6304";

  return payload + crc16(payload);
}
