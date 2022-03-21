import {
  RouteProp,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { HomeStackParamList } from "routes/HomeStack";
import Cross from "assets/images/ic_cross.svg";
import HeaderTitle from "ui/components/headers/header_title/HeaderTitle";
import VenueDetailsView from "./VenueDetailsView";
import { useVenueApis } from "repo/venues/Venues";
import { AppLog, TAG } from "utils/Util";
import { Offer } from "models/Offer";
import { BarMenuRequestModel } from "models/api_requests/BarMenuRequestModel";
import { Venue } from "models/Venue";
import EScreen from "models/enums/EScreen";
import { RootState } from "stores/store";
import useLazyLoadInterface from "hooks/useLazyLoadInterface";
import { useAppDispatch, useAppSelector } from "hooks/redux";
import {
  consumeRefreshCount,
  setBarDetails,
  setRefreshingEvent
} from "stores/generalSlice";
import useSendAnalytics from "hooks/useSendAnalytics";
import { Pressable, View } from "react-native";
import { COLORS, SPACE } from "config";
import { Badge } from "react-native-elements";
import Cart from "assets/images/ic_cart.svg";
import ErrorWithRetryView from "ui/components/molecules/ErrorWithRetryView";
import { CartCountRequestModel } from "models/api_requests/CartCountRequestModel";
import HeaderLeftTextWithIcon from "ui/components/headers/header_left_text_with_icon/HeaderLeftTextWithIcon";
import { usePreventDoubleTap } from "hooks";
import { isBundleOfferExpired } from "models/DateTime";

type VenueDetailsScreenProps = RouteProp<
  HomeStackParamList,
  "VenueDetails"
>;
type VenueDetailsNavigationProp = StackNavigationProp<
  HomeStackParamList,
  "VenueDetails"
>;

type Props = {};

function VenueDetailsController({}: Props) {
  const navigation = useNavigation<VenueDetailsNavigationProp>();
  const route = useRoute<VenueDetailsScreenProps>();
  const { refreshingEvent, barDetails } = useAppSelector(
    (state: RootState) => state.general
  );
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [barMenus, setBarMenus] = useState<Offer[]>();

  const _notificationType = route?.params?.notification?.type ?? undefined;

  const { request: fetchBarMenus } = useVenueApis().getBarMenus;
  const { request: fetchVenuesById } = useVenueApis().getBarDetailsById;
  const { request: fetchVenueCartCount } = useVenueApis().venueCartCount;
  const { sendAnalytics } = useSendAnalytics();
  const [showError, setshowError] = useState<boolean>(false);
  const [barCartCount, setBarCartCount] = useState<number>(0);

  const getBarDetails = useCallback(
    async (id?: number) => {
      const { hasError, dataBody } = await fetchVenuesById({
        establishment_id: route?.params?.id ?? id
      });

      AppLog.log(
        () => "\n\nBarDetails--:>> " + JSON.stringify(dataBody),
        TAG.CART
      );
      if (!hasError && dataBody !== undefined) {
        AppLog.log(
          () => "\n\nifCheckVanue: " + JSON.stringify(barDetails),
          TAG.CART
        );
        if (!barDetails) {
          setshowError(true);
        }

        dispatch(setBarDetails(dataBody.data));
        AppLog.log(
          () => "\n\nBarDetails: " + JSON.stringify(dataBody),
          TAG.API
        );
      } else {
        if (!barDetails) {
          setshowError(true);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchVenuesById]
  );

  const requestModel = useRef<BarMenuRequestModel>({
    source: "mobile",
    menu_type: route.params.venue?.epos_name
  });

  const getBarMenusData = useCallback(async () => {
    requestModel.current.establishment_id =
      route?.params?.venue?.id ??
      route.params?.id ??
      route?.params?.notification?.establishment_id;
    const { hasError, dataBody } = await fetchBarMenus(
      requestModel.current
    );
    if (!hasError && dataBody !== undefined) {
      let updatedBundleOffers: Offer[] = [];
      dataBody.data.forEach((data: Offer) => {
        if (!isBundleOfferExpired(data) && data.is_push !== 0) {
          updatedBundleOffers.push(data);
        }
      });
      setBarMenus(updatedBundleOffers);
      //AppLog.log(() => "BarMenus: " + JSON.stringify(dataBody), TAG.VENUE);
    }
  }, [route.params, fetchBarMenus]);

  const cartCountRequestModel = useRef<CartCountRequestModel>({
    establishment_id:
      route?.params?.venue?.id ??
      route.params?.id ??
      route?.params?.notification?.establishment_id ??
      0
  });

  const getBarCartCount = useCallback(async () => {
    const { hasError, dataBody } = await fetchVenueCartCount(
      cartCountRequestModel.current
    );
    AppLog.log(
      () =>
        "cartCountRequestModel" +
        JSON.stringify(cartCountRequestModel.current) +
        JSON.stringify(dataBody),
      TAG.CART
    );
    if (!hasError && dataBody !== undefined) {
      setBarCartCount(dataBody.count);
    }
  }, [fetchVenueCartCount]);

  const openMyCartScreen = usePreventDoubleTap(() => {
    navigation.push("MyCart", {
      isFrom: EScreen.VENUE_DETAIL,
      establishment_id: barDetails?.id
    });
  });

  const onBackButtonPressed = usePreventDoubleTap(() => {
    navigation.goBack();
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle
          text={barDetails?.title ?? ""}
          shouldTruncate={false}
        />
      ),
      headerLeft: () => (
        <HeaderLeftTextWithIcon
          icon={() => <Cross fill={COLORS.theme?.interface["500"]} />}
          onPress={onBackButtonPressed}
          containerStyle={{ marginLeft: SPACE.lg }}
        />
      ),
      headerRight: () => (
        <Pressable onPress={() => openMyCartScreen()}>
          {barCartCount > 0 && (
            <View style={{ marginRight: SPACE._2md }}>
              <Cart
                width={30}
                height={30}
                stroke={COLORS.theme?.interface["500"]}
              />
              <Badge
                value={barCartCount ?? 0}
                containerStyle={{
                  position: "absolute",
                  alignSelf: "flex-end"
                }}
                badgeStyle={{
                  width: 18,
                  height: 18,
                  borderRadius: 18 / 2,
                  backgroundColor: "red"
                }}
                textStyle={{ alignSelf: "center", fontSize: 8 }}
              />
            </View>
          )}
        </Pressable>
      )
    });
  }, [
    openMyCartScreen,
    refreshingEvent,
    barDetails,
    navigation,
    barCartCount,
    onBackButtonPressed
  ]);

  useEffect(() => {
    if (refreshingEvent?.SUCCESSFULL_ITEM_ADDED) {
      let event = refreshingEvent?.SUCCESSFULL_ITEM_ADDED;
      AppLog.log(
        () =>
          "event received SUCCESSFULL_ITEM_ADDED " +
          event.barId +
          " " +
          barDetails?.id +
          " " +
          event.quantity +
          " " +
          event.previousQuantity,
        TAG.CART
      );
      if (event.barId === barDetails?.id.toString()) {
        if (refreshingEvent.SUCCESSFULL_ITEM_ADDED.quantity === 0) {
          setBarCartCount((prev) => (prev -= event.product.quantity));
        } else {
          setBarCartCount((prev) => {
            prev += event?.previousQuantity ?? 0;
            return prev;
          });
        }
      }
    }

    if (
      refreshingEvent?.SUCCESSFULL_PURCHASE ||
      refreshingEvent?.REFRESH_APIS_EXPLORE_SCREEN
    ) {
      getBarDetails(barDetails?.id!);
      getBarCartCount();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshingEvent]);

  useEffect(() => {
    sendAnalytics("profile_view", barDetails?.id.toString()!);
    // getCartCountApi here
    if (
      route.params.isFrom === EScreen.PUSH_NOTIFICATION ||
      route.params?.id
    ) {
      getBarDetails(
        route?.params?.notification?.establishment_id ??
          route.params?.id ??
          barDetails?.id
      );
    }

    getBarMenusData();
    getBarCartCount();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Handle event from refreshing api event
  useEffect(() => {
    if (
      refreshingEvent?.SUCCESSFULL_REDEMPTION &&
      refreshingEvent?.SUCCESSFULL_REDEMPTION?.venueId === barDetails?.id
    ) {
      AppLog.log(
        () => "Refreshing Event => VenueDetailsController #",
        TAG.REFRESHING_EVENT
      );
      dispatch(
        setBarDetails({
          ...barDetails,
          can_redeem_offer: false
        } as Venue)
      );
    }

    if (refreshingEvent?.SUCCESSFULL_PURCHASE) {
      AppLog.log(
        () =>
          "received event " +
          refreshingEvent.SUCCESSFULL_PURCHASE!.bar_id +
          " " +
          barDetails?.id,
        TAG.IN_APP_PURCHASE
      );
      if (
        Number(refreshingEvent.SUCCESSFULL_PURCHASE.bar_id) ===
        Number(barDetails?.id)
      ) {
        AppLog.log(
          () => "---received event matched---",
          TAG.IN_APP_PURCHASE
        );

        setRefreshing(true);
        getBarDetails(barDetails?.id!).then(() => setRefreshing(false));
        dispatch(
          setRefreshingEvent({
            REFRESH_APIS_EXPLORE_SCREEN: [
              EScreen.VENUE_DETAIL_ABOUT,
              EScreen.VENUE_DETAIL_MENU,
              EScreen.VENUE_DETAIL_WHATSON
            ]
          })
        );
        setTimeout(() => {
          dispatch(consumeRefreshCount());
        }, 500);
      } else {
        AppLog.log(
          () => "---received event not matched---",
          TAG.IN_APP_PURCHASE
        );
      }
    }
    //Do not provide barDetails dependency, it will cause infinite rerendering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshingEvent]);

  useLayoutEffect(() => {
    dispatch(setBarDetails(route?.params?.venue ?? undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    getBarDetails(barDetails?.id!).then(() => setRefreshing(false));

    dispatch(
      setRefreshingEvent({
        REFRESH_APIS_EXPLORE_SCREEN: [
          EScreen.VENUE_DETAIL_ABOUT,
          EScreen.VENUE_DETAIL_MENU,
          EScreen.VENUE_DETAIL_WHATSON
        ]
      })
    );

    setTimeout(() => {
      dispatch(consumeRefreshCount());
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barDetails?.id, dispatch]);

  const completeInteractionAfter = useCallback(
    () => barDetails !== undefined,
    [barDetails]
  );

  return (
    <>
      {!barDetails && showError && (
        <View
          style={{
            width: "100%",
            height: "100%",
            justifyContent: "center",
            paddingHorizontal: SPACE._2lg
          }}>
          <ErrorWithRetryView
            retryCallback={() => {
              setshowError(false);
              getBarDetails();
            }}
          />
        </View>
      )}

      {useLazyLoadInterface(
        <VenueDetailsView
          barMenu={barMenus!}
          navigation={navigation}
          venue={barDetails}
          initialRoute={route.params.initialRoute!}
          isFrom={route.params.isFrom!}
          notificationType={
            !_notificationType ? "offer" : _notificationType
          }
          initialSegmentForWhatsOnIndex={
            route.params.initialSegmentForWhatsOnIndex
          }
          initialSegmentForMenuIndex={
            route.params.initialSegmentForMenuIndex
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
          barCartCount={barCartCount}
          navigateToMyCart={openMyCartScreen}
        />,
        undefined,
        undefined,
        completeInteractionAfter
      )}
    </>
  );
}

export default VenueDetailsController;
