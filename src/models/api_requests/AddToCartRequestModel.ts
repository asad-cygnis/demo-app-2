export type AddToCartRequestModel = {
  id?: string;
  establishment_id?: number;
  quantity?: number;
  cart_type?: string;
  cart_item_id?: number;
  modifier_details?: [{ id: string; quantity: number; menu_id: string }];
  sub_menu_ids?: string | number[];
  comment?: string;
  offer_type?: string;
  exclusive_offer_id?: string;
  redeem_type?: string;
  deal_price?: number;
  group_type?: string;
  bundle_quan_update?: boolean;
};
