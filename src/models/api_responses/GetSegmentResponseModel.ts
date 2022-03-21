import { BarMenu } from "models/BarMenu";
import DateTime from "models/DateTime";
import EPosType from "models/enums/EPosType";
import { EstablishmentTimings } from "models/Venue";
import { ApiSuccessResponseModel } from "./ApiSuccessResponseModel";

type GetSegmentResponseModel = ApiSuccessResponseModel<MenuSegment[]>;

export interface MenuSegment {
  id: number;
  establishment_id: number;
  name: string;
  status: number;
  sequence: number;
  created_at: DateTime;
  updated_at: DateTime;
  deleted_at: null;
  menu_type: EPosType;
  epos_category_id: null;
  is_time: number;
  start_time: null | string;
  end_time: null | string;
  items: BarMenu[];
  establishment_timings?: EstablishmentTimings;
  description?: string;
  key: () => string;
}

export default GetSegmentResponseModel;
