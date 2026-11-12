import type { OrderGetResponseDto } from "@/hooks/api/orders";

export const ORDER_CONSTANTS = {
  PAGE_SIZE: 20,
  /** The API's list maximum: enough for every group in a shop. */
  GROUP_PAGE_SIZE: 100,
  CUSTOMER_SEARCH_DEBOUNCE_MS: 250,
  /** Repurchases the API needs before it learns a cycle (ORDER_LEARNED_CYCLE_MIN_PAIRS). */
  LEARNED_CYCLE_MIN_PAIRS: 5,
} as const;

export const ORDER_QUERY_PARAMS = [
  "page",
  "search",
  "status",
  "source",
  "productGroup",
];

export const PRODUCT_GROUP_QUERY_PARAMS = ["page", "search"];

export const ORDER_STATUS_COLOR = {
  PENDING: "orange",
  CONFIRMED: "green",
  CANCELLED: "grey",
} as const satisfies Record<OrderGetResponseDto["status"], string>;

// SAFETY: the keys are the statuses, checked by `satisfies` above.
export const ORDER_STATUSES = Object.keys(
  ORDER_STATUS_COLOR,
) as OrderGetResponseDto["status"][];

/** The statuses an order can be saved with; Huỷ đơn is its own action. */
export const ORDER_FORM_STATUSES = ["CONFIRMED", "PENDING"] as const;

export const ORDER_SOURCES: OrderGetResponseDto["source"][] = [
  "CHAT",
  "MANUAL",
  "IMPORT",
];

/** The API stores an order in đồng unless it says otherwise. */
export const ORDER_DEFAULT_CURRENCY = "VND";

/** Order fields a file column can fill, in the order the select lists them. */
export const ORDER_IMPORT_FIELDS = [
  "code",
  "phone",
  "name",
  "item",
  "group",
  "quantity",
  "unitPrice",
  "total",
  "orderedAt",
  "status",
] as const;

/** Rows the import endpoint takes in one request (ORDER_IMPORT_MAX_ROWS). */
export const ORDER_IMPORT_MAX_ROWS = 200;

/**
 * Header names, without accents, that guess a column's field. A header that
 * is not listed is tried as a prefix ("so dien thoai khach" is a phone).
 */
export const ORDER_IMPORT_HEADER_ALIASES: Record<
  (typeof ORDER_IMPORT_FIELDS)[number],
  string[]
> = {
  code: [
    "ma don",
    "ma don hang",
    "ma",
    "order code",
    "order id",
    "order",
    "code",
  ],
  phone: ["sdt", "so dien thoai", "dien thoai", "phone", "mobile", "sdt khach"],
  name: [
    "ten khach",
    "ten khach hang",
    "khach hang",
    "ho ten",
    "customer",
    "name",
    "ten",
  ],
  item: ["san pham", "ten san pham", "ten hang", "mat hang", "product", "item"],
  group: [
    "nhom hang",
    "nhom",
    "danh muc",
    "loai",
    "category",
    "product group",
    "group",
  ],
  quantity: ["sl", "so luong", "qty", "quantity"],
  unitPrice: ["gia", "don gia", "gia ban", "price", "unit price"],
  total: ["tong", "tong tien", "thanh tien", "total", "amount"],
  orderedAt: [
    "ngay dat",
    "ngay",
    "ngay mua",
    "date",
    "order date",
    "thoi gian",
  ],
  status: ["trang thai", "status"],
};

/**
 * The sample file on the import's first step, one per language: two products
 * in one order (same code), then an order awaiting confirmation. The headers
 * are names Ecbot guesses, in ORDER_IMPORT_FIELDS order.
 */
export const ORDER_IMPORT_TEMPLATES = {
  vi: {
    filename: "mau-nhap-don-hang.csv",
    headers: [
      "Mã đơn",
      "SĐT",
      "Tên khách",
      "Sản phẩm",
      "Nhóm hàng",
      "Số lượng",
      "Đơn giá",
      "Tổng tiền",
      "Ngày đặt",
      "Trạng thái",
    ],
    rows: [
      [
        "DH001",
        "0901234567",
        "Nguyễn Thu Hà",
        "Serum vitamin C",
        "Serum",
        "1",
        "350000",
        "590000",
        "01/11/2026",
        "Đã xác nhận",
      ],
      [
        "DH001",
        "0901234567",
        "Nguyễn Thu Hà",
        "Nước tẩy trang",
        "Tẩy trang",
        "2",
        "120000",
        "590000",
        "01/11/2026",
        "Đã xác nhận",
      ],
      [
        "DH002",
        "0912345678",
        "Trần Minh Anh",
        "Kem chống nắng",
        "Chống nắng",
        "1",
        "280000",
        "280000",
        "03/11/2026",
        "Chờ xác nhận",
      ],
    ],
  },
  en: {
    filename: "order-import-template.csv",
    headers: [
      "Order code",
      "Phone",
      "Customer name",
      "Product",
      "Product group",
      "Quantity",
      "Unit price",
      "Total",
      "Order date",
      "Status",
    ],
    rows: [
      [
        "DH001",
        "0901234567",
        "Nguyen Thu Ha",
        "Vitamin C serum",
        "Serum",
        "1",
        "350000",
        "590000",
        "2026-11-01",
        "Confirmed",
      ],
      [
        "DH001",
        "0901234567",
        "Nguyen Thu Ha",
        "Makeup remover",
        "Makeup remover",
        "2",
        "120000",
        "590000",
        "2026-11-01",
        "Confirmed",
      ],
      [
        "DH002",
        "0912345678",
        "Tran Minh Anh",
        "Sunscreen",
        "Sunscreen",
        "1",
        "280000",
        "280000",
        "2026-11-03",
        "Pending",
      ],
    ],
  },
} as const;
