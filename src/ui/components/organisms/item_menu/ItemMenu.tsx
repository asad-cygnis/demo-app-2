import { COLORS, FONT_SIZE, SPACE } from "config";
import { BarMenu } from "models/BarMenu";
import React, { useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle
} from "react-native";
import {
  AppLabel,
  TEXT_TYPE
} from "ui/components/atoms/app_label/AppLabel";
import {
  setRefreshingEvent,
  consumeRefreshCount
} from "stores/generalSlice";
import { useAppDispatch } from "hooks/redux";
import { AppLog, Price, TAG } from "utils/Util";
import Cart from "assets/images/ic_cart.svg";
import { useAppSelector } from "hooks/redux";
import { RootState } from "stores/store";
import Separator from "ui/components/atoms/separator/Separator";
import { HomeStackParamList } from "routes/HomeStack";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import HTMLView from "react-native-htmlview";
import ESupportedOrderType from "models/enums/ESupportedOrderType";
import TrashIcon from "assets/images/trash_red.svg";
import { useAddCartApi } from "repo/myCart/MyCarts";
import { AddToCartRequestModel } from "models/api_requests/AddToCartRequestModel";
import SimpleToast from "react-native-simple-toast";
import Strings from "config/Strings";
import ItemRelatedProduct from "../item_related_products/ItemRelatedProduct";
import { FlatListWithPbHorizontal } from "../flat_list/FlatListWithPbHorizontal";
import _ from "lodash";
import { isBarOperatesToday, Venue } from "models/Venue";
import EProductGroupType from "models/enums/EProductGroupType";

interface Props {
  menu: BarMenu;
  isExpanded?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  menuType?: ESupportedOrderType;
  _venue: Venue;
}

type HomeNavigationProps = StackNavigationProp<
  HomeStackParamList,
  "VenueDetails"
>;

const ItemMenu = ({ menu, containerStyle, menuType, _venue }: Props) => {
  const homeNavigation = useNavigation<HomeNavigationProps>();

  const { regionData } = useAppSelector(
    (state: RootState) => state.general
  );
  const dispatch = useAppDispatch();

  const { loading, request: addToCartProduct } = useAddCartApi().addToCart;

  const addToCartrequestModel = useRef<AddToCartRequestModel>({
    id: `${menu.id}`,
    establishment_id: menu.establishment_id,
    quantity: 0,
    cart_type: menuType === ESupportedOrderType.ALL ? undefined : menuType,
    comment: menu.comment!
  });

  const onSuccessItemAdded = (
    cart_item_id?: number | null,
    _quantity?: number
  ) => {
    dispatch(
      setRefreshingEvent({
        SUCCESSFULL_ITEM_ADDED: {
          barId: `${menu.establishment_id}`,
          cartType: menuType!,
          product: _.omit(menu, "key"),
          cart_item_id: cart_item_id,
          quantity: _quantity
        }
      })
    );

    setTimeout(() => {
      dispatch(consumeRefreshCount());
    }, 500);
  };

  const updateCart = useCallback(
    async () => {
      addToCartrequestModel.current.cart_item_id = undefined;

      if (menu.group_type === EProductGroupType.BUNDLE) {
        let menuIds: number[] = [];
        menu.sub_menus?.map((item) => {
          menuIds.push(Number(item.id));
        });
        addToCartrequestModel.current.sub_menu_ids = menuIds;
        addToCartrequestModel.current.group_type =
          EProductGroupType.BUNDLE;
        addToCartrequestModel.current.deal_price = menu.deal_price;
      } else {
        addToCartrequestModel.current.sub_menu_ids = menu.sub_menu_ids!;
      }

      const { hasError, dataBody, errorBody } = await addToCartProduct(
        addToCartrequestModel.current
      );
      if (!hasError && dataBody) {
        SimpleToast.show("Item deleted successfully");
        onSuccessItemAdded(null, 0);
      } else {
        SimpleToast.show(errorBody ?? "Unable to delete this product");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addToCartProduct]
  );
  const openMenuScreen = useCallback(
    (barMenu: BarMenu, isRelatedMenu: boolean = false) => {
      AppLog.log(
        () => "openMenuScreen: " + JSON.stringify(barMenu),
        TAG.MENU
      );
      homeNavigation.navigate("MenuDetail", {
        menu: !isRelatedMenu ? _.omit(barMenu, "key") : undefined,
        menu_id: barMenu.id,
        menuType: menuType!,
        productType: menu.group_type,
        isUpdating:
          !menu.have_modifiers && barMenu.quantity > 0 ? true : false,
        quantity:
          !menu.have_modifiers && barMenu.quantity > 0
            ? barMenu.quantity
            : 1,
        establishment_id: barMenu.establishment_id,
        supportedType: barMenu.menu_type
      });
    },
    [homeNavigation, menu, menuType]
  );

  const renderRelatedProductsItem = useCallback(
    ({ item }: { item: BarMenu }) => {
      item.establishment_id = menu.establishment_id;
      item.price = menu.price;

      return (
        <ItemRelatedProduct
          key={item.id}
          image={item.image!}
          onPress={() => openMenuScreen(item, true)}
        />
      );
    },
    [openMenuScreen, menu]
  );

  return (
    <View
      style={[
        {
          backgroundColor: COLORS.theme?.interface["100"]
        },
        containerStyle
      ]}>
      <View style={[styles.container]}>
        <Image
          source={
            menu.image
              ? { uri: menu.image }
              : require("assets/images/cart_placeholder.png")
          }
          style={[
            styles.imageStyle,
            !menu?.image && {
              borderColor: COLORS.theme?.interface["300"],
              borderWidth: 1
            }
          ]}
        />

        <View style={[styles.rightContainer]}>
          <AppLabel
            text={menu?.name}
            style={styles.heading}
            textType={TEXT_TYPE.SEMI_BOLD}
          />

          <HTMLView value={menu?.description ?? ""} />
          <View style={[styles.bottomContainer]}>
            {isBarOperatesToday(_venue) === false ||
            _venue?.is_payment_app === false ? (
              menu.price !== null &&
              menu.price !== 0 &&
              menu.group_type !== EProductGroupType.BUNDLE ? (
                <View style={styles.cartContainer}>
                  <AppLabel
                    text={Price.toString(
                      regionData?.currency_symbol,
                      menu?.price
                    )}
                    style={[styles.heading, { paddingStart: SPACE.xs }]}
                    textType={TEXT_TYPE.SEMI_BOLD}
                  />
                </View>
              ) : (
                <></>
              )
            ) : (
              <Pressable
                style={({ pressed }) => [
                  {
                    opacity: _venue?.is_payment_app && pressed ? 0.5 : 1.0
                  }
                ]}
                onPress={
                  _venue?.is_payment_app && isBarOperatesToday(_venue)
                    ? () => openMenuScreen(menu)
                    : () => {}
                }>
                <View style={styles.cartContainer}>
                  {_venue?.is_payment_app &&
                    isBarOperatesToday(_venue) && (
                      <Cart
                        stroke={COLORS.theme?.primaryColor}
                        width={16}
                        height={16}
                        style={styles.cartIcon}
                      />
                    )}

                  {menu.group_type !== EProductGroupType.BUNDLE &&
                    menu.price !== 0 &&
                    menu.price !== null && (
                      <AppLabel
                        text={Price.toString(
                          regionData?.currency_symbol,
                          menu?.price
                        )}
                        style={[
                          styles.heading,
                          { paddingStart: SPACE.xs }
                        ]}
                        textType={TEXT_TYPE.SEMI_BOLD}
                      />
                    )}
                </View>
              </Pressable>
            )}
            <View style={{ justifyContent: "flex-end" }}>
              <ActivityIndicator
                animating={loading}
                style={[styles.mb5]}
              />
            </View>
            {menu.quantity >= 1 && (
              <>
                <Pressable
                  style={[styles.itemCountLabel]}
                  onPress={() => updateCart()}>
                  <AppLabel
                    text={`${menu.quantity} ${
                      menu.quantity > 1 ? "Items" : "Item"
                    } added`}
                    style={[styles.itemCountColor]}
                  />
                  <TrashIcon
                    height={18}
                    width={18}
                    style={{ marginLeft: 5 }}
                  />
                </Pressable>
              </>
            )}
          </View>

          {menu.related_menus?.length !== undefined &&
            menu.related_menus?.length > 0 && (
              <>
                <AppLabel
                  text={Strings.venue_details.menu.related_products}
                  style={styles.relatedProducts}
                  textType={TEXT_TYPE.SEMI_BOLD}
                />

                <FlatListWithPbHorizontal<BarMenu>
                  data={menu?.related_menus}
                  renderItem={renderRelatedProductsItem}
                  style={[styles.list]}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingTop: SPACE.sm }}
                  keyExtractor={(item) => item.id.toString()}
                />
              </>
            )}
        </View>
      </View>

      {!containerStyle && (
        <>
          <Separator
            color={COLORS.theme?.primaryBackground}
            thickness={0.9}
          />
          <View style={{ paddingBottom: SPACE.lg }} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: SPACE.md,
    paddingBottom: SPACE.lg
  },
  imageStyle: {
    width: 55,
    height: 55,
    borderRadius: 8,
    resizeMode: "cover"
  },
  rightContainer: {
    flex: 1,
    paddingHorizontal: SPACE._2md
  },
  heading: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.theme?.interface["900"]
  },
  cartContainer: {
    flexDirection: "row",
    marginTop: SPACE.sm,
    alignItems: "center",
    alignContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE._2xs,
    backgroundColor: COLORS.theme?.primaryBackground,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: COLORS.theme?.borderColor
  },
  itemCountLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5
  },
  bottomContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  itemCountColor: {
    color: COLORS.theme?.primaryColor,
    fontSize: FONT_SIZE._2xs
  },
  mb5: { marginBottom: 5 },
  relatedProducts: {
    paddingTop: SPACE.lg
  },
  list: {
    flex: 1
  },
  cartIcon: {
    padding: SPACE._2xs
  }
});

export default ItemMenu;
