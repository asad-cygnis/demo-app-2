import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useAppSelector } from "hooks/redux";
import _ from "lodash";
import { AddToCartRequestModel } from "models/api_requests/AddToCartRequestModel";
import { SetOfferBookMarkedApiRequestModel } from "models/api_requests/SetOfferBookMarkedApiRequestModel";
import { VenueOfferApiRequestModel } from "models/api_requests/VenueOfferApiRequestModel";
import { isExpired } from "models/DateTime";
import EScreen from "models/enums/EScreen";
import { Offer } from "models/Offer";
import React, {
  FC,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { Linking, Platform } from "react-native";
import SimpleToast from "react-native-simple-toast";
import { useDispatch } from "react-redux";
import { useEditsApis } from "repo/edits/EditsApis";
import { useAddCartApi } from "repo/myCart/MyCarts";
import { useVenueApis } from "repo/venues/Venues";

import { HomeStackParamList } from "routes/HomeStack";
import { setUpdateCartFromRedeem } from "stores/generalSlice";
import { RootState } from "stores/store";
import { AppLog, TAG } from "utils/Util";
import { OffersView } from "./OffersView";

type HomeNavigationProp = StackNavigationProp<
  HomeStackParamList,
  "MyCart"
>;

type Props = {};

const OffersController: FC<Props> = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const [offers, setOffers] = useState<Offer[] | undefined>(undefined);
  // const offerId = useRef(0);
  // let lastIndex = 0;
  const [showPb, setShouldShowPb] = useState(false);
  const { request: getOffersRequest } = useVenueApis().offers;
  const { updateCartFromRedeem, barDetails } = useAppSelector(
    (state: RootState) => state.general
  );
  const dispatch = useDispatch();

  const fetchOffersRequest = useCallback(async () => {
    setShouldShowPb(true);
    const requestModelOffers: VenueOfferApiRequestModel = {
      source: "mobile",
      establishment_id: barDetails?.id?.toString() ?? "",
      pagination: true
    };
    const { hasError, errorBody, dataBody } = await getOffersRequest(
      requestModelOffers
    );

    if (hasError || dataBody === undefined) {
      setShouldShowPb(false);
      throw new Error(errorBody);
    } else {
      let updatedOffers: Offer[] = [];
      dataBody.data.forEach((offer) => {
        if (!isExpired(offer)) {
          updatedOffers.push(offer);
        }
      });
      setShouldShowPb(false);
      setOffers(updatedOffers);
      // offerId.current = dataBody.data[0].id;
    }
  }, [getOffersRequest, barDetails]);

  useEffect(() => {
    fetchOffersRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Handle event from refreshing api event
  const { refreshingEvent } = useAppSelector(
    (state: RootState) => state.general
  );

  useEffect(() => {
    if (refreshingEvent?.SUCCESSFULL_REDEMPTION) {
      fetchOffersRequest();
      if (refreshingEvent?.SUCCESSFULL_REDEMPTION?.isVoucher) {
        fetchOffersRequest();
      } else {
        let findItem = offers?.find(
          (item: Offer) =>
            item.establishments?.id ===
            refreshingEvent?.SUCCESSFULL_REDEMPTION?.venueId
        );

        let findIndex = offers?.findIndex(
          (item: Offer) =>
            item.establishments?.id ===
            refreshingEvent?.SUCCESSFULL_REDEMPTION?.venueId
        );

        if (findItem) {
          findItem.establishments!.can_redeem_offer = false;
          setOffers((prev) => {
            return _.cloneDeep(prev?.splice(findIndex!, 1, findItem!));
          });
        }
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshingEvent]);

  const onOfferSnapChanged = (changedItemIndex: number) => {
    if (changedItemIndex === offers?.length! - 1) {
      // onEndReached();
    }
  };

  const { request: setOfferBookmarkedRequest, loading: bookmarkedPb } =
    useEditsApis().setOfferBookmarked;

  const onSaveBookmark = async (
    id: number,
    isFavourite: boolean,
    callBack: () => void
  ) => {
    const requestModel: SetOfferBookMarkedApiRequestModel = {
      offer_id: id,
      is_favorite: !isFavourite
    };
    const { hasError, dataBody } = await setOfferBookmarkedRequest(
      requestModel
    );
    if (!hasError && dataBody !== undefined) {
      callBack();
      SimpleToast.show(dataBody.message);
    }
  };

  const openGoogleMap = useCallback(
    (lat: string, lng: string, title: string) => {
      AppLog.log(() => lat + " " + lng, TAG.EDITS);
      const provider = Platform.OS === "ios" ? "apple" : "google";
      const link = `http://maps.${provider}.com/?daddr=${lat},${lng}(${title})`;
      Linking.openURL(link);
    },
    []
  );

  const requestModel = useRef<AddToCartRequestModel>({});
  const { request: addToCartProduct } = useAddCartApi().addToCart;

  const updateCart = useCallback(async () => {
    const { dataBody, hasError, errorBody } = await addToCartProduct(
      requestModel?.current
    );
    if (hasError || dataBody === undefined) {
      dispatch(setUpdateCartFromRedeem(undefined));
      SimpleToast.show(errorBody!);
      return;
    } else {
      dispatch(setUpdateCartFromRedeem(undefined));
      SimpleToast.show(
        "Deal redeemed successfully. Please checkout from my cart."
      );
      navigation.navigate("MyCart", {
        isFrom: EScreen.VENUE_DETAIL,
        establishment_id: requestModel.current.establishment_id,
        exclusive_id: requestModel.current.exclusive_offer_id
      });
    }
  }, [addToCartProduct, navigation, dispatch]);

  useEffect(() => {
    if (updateCartFromRedeem !== undefined) {
      requestModel.current.offer_type = updateCartFromRedeem.offer_type;
      requestModel.current.exclusive_offer_id =
        updateCartFromRedeem.exclusive_offer_id;
      requestModel.current.redeem_type = updateCartFromRedeem.redeem_type;
      requestModel.current.quantity = Number(
        updateCartFromRedeem.quantity
      );
      requestModel.current.establishment_id = Number(
        updateCartFromRedeem.establishment_id
      );
      requestModel.current.id = updateCartFromRedeem.id;
      requestModel.current.cart_type = updateCartFromRedeem.cart_type;
      updateCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateCartFromRedeem]);

  //Handle event from refreshing api event
  useEffect(() => {
    if (
      refreshingEvent?.REFRESH_APIS_EXPLORE_SCREEN &&
      refreshingEvent.REFRESH_APIS_EXPLORE_SCREEN.includes(
        EScreen.VENUE_DETAIL_WHATSON
      )
    ) {
      // setOffers([]);
      fetchOffersRequest();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshingEvent]);
  return (
    <OffersView
      isLoading={showPb}
      // isAllDataLoaded={isAllDataLoaded}
      // pullToRefreshCallback={onPullToRefresh}
      // onEndReached={onEndReached}
      data={offers}
      saveBookmark={onSaveBookmark}
      onOfferSnapChanged={onOfferSnapChanged}
      openGoogleMap={(latitude, longitude, title) => {
        openGoogleMap(latitude.toString(), longitude.toString(), title);
      }}
      shouldShowBookmarkedPb={bookmarkedPb}
    />
  );
};
export default OffersController;
