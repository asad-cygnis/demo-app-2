/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  RouteProp,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AddToCartRequestModel } from "models/api_requests/AddToCartRequestModel";
import { GetModifierDetailsRequestModel } from "models/api_requests/GetModifierDetailsRequestModel";
import {
  ModifierDetails,
  ModifierGroup
} from "models/api_responses/ModifierDetailsResponseModel";
import React, {
  FC,
  MutableRefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { useAppDispatch, useAppSelector } from "hooks/redux";
import Cross from "assets/images/ic_cross.svg";
import SimpleToast from "react-native-simple-toast";
import { useAddCartApi } from "repo/myCart/MyCarts";
import { useVenueApis } from "repo/venues/Venues";
import { HomeStackParamList } from "routes/HomeStack";
import HeaderLeftTextWithIcon from "ui/components/headers/header_left_text_with_icon/HeaderLeftTextWithIcon";
import HeaderTitle from "ui/components/headers/header_title/HeaderTitle";
import { MenuDetailView } from "./MenuDetailView";
import { COLORS, SPACE } from "config";
import {
  setRefreshingEvent,
  consumeRefreshCount,
  setUpdateCartFromRedeem
} from "stores/generalSlice";
import _ from "lodash";
import { BarMenu } from "models/BarMenu";
import { FetchSingleProductRequestModel } from "models/api_requests/FetchSingleProductRequestModel";
import { usePreventDoubleTap } from "hooks";
import { RootState } from "stores/store";
import { AppLog, TAG } from "utils/Util";
import EScreen from "models/enums/EScreen";
import Strings from "config/Strings";
import ESupportedOrderType from "models/enums/ESupportedOrderType";
import EProductGroupType from "models/enums/EProductGroupType";

type Props = {};
type HomeRouteProp = RouteProp<HomeStackParamList, "MenuDetail">;
type HomeNavigationProp = StackNavigationProp<
  HomeStackParamList,
  "MenuDetail"
>;

const MenuDetailController: FC<Props> = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const route = useRoute<HomeRouteProp>();
  const [menu, setMenu] = useState<BarMenu | undefined>(route.params.menu);
  const menu_id = route.params.menu_id;
  const menuType = route.params.menuType;
  const redeemType = route.params.redeemType;
  const exclusiveOfferId = route.params.exclusive_offer_id;
  const establishment_id = route.params.establishment_id;
  const productType = route.params.productType;
  const supportedType = route.params.supportedType;
  const isUpdating = route.params.isUpdating;
  const quantity = route.params.quantity;
  const selectedBundleIds = route.params.selectedBundleIds;
  const [comments, setComments] = useState<string>();
  const [modifiers, setModifiers] = useState<
    ModifierDetails[] | undefined
  >(undefined);
  const [grandTotal, setGrandTotal] = useState<number>(0);
  const requestModel = useRef<GetModifierDetailsRequestModel>({
    establishment_id: Number(establishment_id),
    product_id: menu_id ?? 0,
    type: supportedType
  });
  const dispatch = useAppDispatch();

  const onSuccessItemAdded = useCallback(
    (
      cart_item_id: number,
      _quantity: number,
      previousQuantity: number
    ) => {
      dispatch(
        setRefreshingEvent({
          SUCCESSFULL_ITEM_ADDED: {
            barId: `${menu?.establishment_id}`,
            cartType: menuType,
            product: _.omit(menu, "key"),
            cart_item_id: cart_item_id,
            quantity: _quantity,
            previousQuantity: previousQuantity
          }
        })
      );
      dispatch(consumeRefreshCount());
    },
    [dispatch, menu, menuType]
  );

  const { loading, request: fetchModifiers } =
    useVenueApis().getProductModifiers;

  const { loading: singleProductLoader, request: fetchSingleProduct } =
    useVenueApis().getSingleProduct;

  const singleProductRequestModel = useRef<FetchSingleProductRequestModel>(
    {
      supported_order_type: menuType,
      product_id: menu_id
    }
  );

  const getBarMenusData = useCallback(async () => {
    requestModel.current.establishment_id = Number(establishment_id);
    if (isUpdating) {
      requestModel.current.cart_item_id = menu?.cart_item_id!;
    }
    const { hasError, dataBody } = await fetchModifiers(
      requestModel.current
    );

    if (!hasError && dataBody !== undefined) {
      if (menu?.group_type === EProductGroupType.BUNDLE) {
        if (isUpdating) {
          dataBody.data.map((item) => {
            if (selectedBundleIds!.includes(item.id)) {
              item.isSelected = true;
            }
          });
        }
      } else {
        dataBody.data.map((item) => {
          item.isSelected = true;
        });
      }
      setModifiers(_.cloneDeep(dataBody.data));
      if (menu?.group_type === EProductGroupType.BUNDLE) {
        calculatePriceForBundle(isUpdating ? menu?.quantity ?? 0 : 1);
      } else {
        calculatePrice(isUpdating ? menu?.quantity ?? 0 : 1);
      }
    } else {
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchModifiers]);

  const getProductDetails = useCallback(async () => {
    const { hasError, dataBody, errorBody } = await fetchSingleProduct(
      singleProductRequestModel.current
    );
    if (!hasError && dataBody !== undefined) {
      setMenu(dataBody.data);
      requestModel.current.type = dataBody.data.menu_type;
      getBarMenusData();
    } else {
      SimpleToast.show(errorBody ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSingleProduct]);

  useEffect(() => {
    if (menu === undefined) {
      getProductDetails();
    } else {
      getBarMenusData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchModifierQuantity = (group: ModifierGroup) => {
    let total = 0;
    group.modifiers?.map((data) => {
      total += data.isSelected ? data.quantity! : 0;
    });
    return total;
  };

  const isDataValid = () => {
    let BreakException = {};
    let isValid = true;
    try {
      modifiers?.forEach(function () {
        let filteredData: ModifierDetails[] = [];
        if (menu?.group_type === EProductGroupType.BUNDLE) {
          filteredData = modifiers.filter((item) => {
            return item.isSelected;
          });
          if (filteredData.length !== 2) {
            SimpleToast.show(
              "Please select at least 2 products to continue"
            );
            isValid = false;
            throw BreakException;
          }
        } else {
          filteredData = modifiers;
        }
        filteredData?.forEach((group) => {
          if (group.modifier_groups != null) {
            group.modifier_groups.forEach((modifier) => {
              if (
                modifier.min! >= 1 &&
                fetchModifierQuantity(modifier) < modifier.min!
              ) {
                SimpleToast.show(
                  `Please select at least ${modifier.min} from ${modifier.name}`,
                  5
                );
                isValid = false;
                throw BreakException;
              }
            });
          }
        });
      });
    } catch (e) {
      if (e !== BreakException) {
        throw e;
      }
    }
    return isValid;
  };

  let modifierDetailsContainer: [
    { id: string; quantity: number; menu_id: string }
  ] = [{ id: "", quantity: 0, menu_id: "" }];

  // eslint-disable-next-line @typescript-eslint/no-shadow
  const addToCart = usePreventDoubleTap(
    async (total: number, stepperValue: number) => {
      if (isDataValid() && total > 0) {
        AppLog.log(
          () => "menu: " + JSON.stringify(menu),
          TAG.EXCLUSIVE_OFFER
        );

        addProductToCart(stepperValue);
      }
    }
  );

  const calculatePrice = useCallback(
    (value: number) => {
      setModifiers((prev) => {
        let productPrice = menu?.price ?? 0;
        let newTotal = 0.0;
        let selectedArray = prev;
        selectedArray &&
          selectedArray!.map((group) => {
            group.modifier_groups != null &&
              group.modifier_groups.map((groupModifiers) => {
                groupModifiers.modifiers?.map((modifier) => {
                  if (modifier.isSelected || modifier.quantity! > 0) {
                    newTotal +=
                      modifier.price! *
                      (modifier.quantity! !== undefined
                        ? modifier.quantity!
                        : 0);
                  }
                });
              });
          });
        setGrandTotal(
          value === 0
            ? productPrice
            : productPrice * value + newTotal * value
        );
        return prev;
      });
    },
    [menu?.price]
  );

  const calculatePriceForBundle = useCallback((value: number) => {
    setModifiers((prev) => {
      let priceContainer: number[] = [];
      let selectedArray = prev;
      let filtered = selectedArray?.filter((item) => {
        return item.isSelected;
      });
      filtered &&
        filtered!.map((group) => {
          let total: number = 0;
          group.modifier_groups != null &&
            group.modifier_groups.map((groupModifiers) => {
              groupModifiers.modifiers?.map((modifier) => {
                if (modifier.isSelected || modifier.quantity! > 0) {
                  total +=
                    modifier.price! *
                    (modifier.quantity! !== undefined
                      ? modifier.quantity!
                      : 0);
                }
              });
            });
          priceContainer.push(total + group.price);
        });
      let largest =
        priceContainer.length > 0 ? Math.max.apply(0, priceContainer) : 0;
      setGrandTotal(largest * value);
      return prev;
    });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-shadow
  const add = (quantity: number, stepper: number) => {
    if (quantity === undefined) {
      return stepper;
    } else {
      return Number(quantity) + Number(stepper);
    }
  };

  const addToCartRequestModel = useRef<AddToCartRequestModel>({
    cart_type: menuType === ESupportedOrderType.ALL ? undefined : menuType
  });

  const { loading: addToCartLoading, request: addToCartProduct } =
    useAddCartApi().addToCart;

  const addProductToCart = useCallback(
    async (stepperCount: number) => {
      modifierDetailsContainer.pop();
      let filtered: ModifierDetails[] = [];
      setModifiers((prev) => {
        if (menu?.group_type === EProductGroupType.BUNDLE) {
          filtered = prev!.filter((item) => {
            return item.isSelected;
          });
        } else {
          filtered = prev ?? [];
        }
        filtered?.forEach((group) => {
          if (group.modifier_groups != null) {
            group.modifier_groups.forEach((modifierGroup) => {
              modifierGroup.modifiers?.forEach((modifier) => {
                if (modifier.isSelected) {
                  modifierDetailsContainer.push({
                    id: `${modifier.id}`,
                    quantity: modifier.quantity!,
                    menu_id: `${modifier.product_id}`
                  });
                }
              });
            });
          }
        });
        return prev;
      });

      setComments((prev) => {
        if (prev !== undefined || prev !== "") {
          addToCartRequestModel.current.comment = prev;
        }
        return prev;
      });

      addToCartRequestModel.current.id = menu?.id.toString() ?? "";
      if (exclusiveOfferId) {
        addToCartRequestModel.current.exclusive_offer_id =
          exclusiveOfferId;
        addToCartRequestModel.current.redeem_type = redeemType;
        addToCartRequestModel.current.offer_type = "exclusive";
      }
      addToCartRequestModel.current.establishment_id =
        menu?.establishment_id ?? 0;
      if (menu?.group_type !== EProductGroupType.SINGLE) {
        if (menu?.group_type === EProductGroupType.BUNDLE) {
          let menuIds: number[] = [];
          filtered.map((item) => {
            menuIds.push(item.id);
          });
          addToCartRequestModel.current.sub_menu_ids = menuIds;
          addToCartRequestModel.current.group_type =
            EProductGroupType.BUNDLE;
        } else {
          addToCartRequestModel.current.sub_menu_ids = JSON.parse(
            menu?.sub_menu_ids!
          );
        }
      }

      if (
        menu?.cart_item_id !== undefined &&
        menu?.cart_item_id !== null
      ) {
        if (
          !menu.have_modifiers &&
          menu.group_type === EProductGroupType.SINGLE
        ) {
          addToCartRequestModel.current.cart_item_id = menu?.cart_item_id!;
        } else {
          if (isUpdating) {
            addToCartRequestModel.current.cart_item_id =
              menu?.cart_item_id!;
          }
        }
      }

      if (exclusiveOfferId) {
        addToCartRequestModel.current.quantity = 1;
      } else {
        if (
          !menu?.have_modifiers &&
          menu?.group_type === EProductGroupType.SINGLE
        ) {
          if (isUpdating) {
            addToCartRequestModel.current.quantity = stepperCount;
          } else {
            addToCartRequestModel.current.quantity = add(
              menu?.quantity ?? 0,
              stepperCount
            );
          }
        } else {
          addToCartRequestModel.current.quantity = stepperCount;
        }
      }

      if (menu?.have_modifiers) {
        addToCartRequestModel.current.modifier_details =
          modifierDetailsContainer;
      }

      if (menu?.group_type === EProductGroupType.BUNDLE) {
        addToCartRequestModel.current.deal_price = grandTotal;
      }

      const { hasError, dataBody, errorBody } = await addToCartProduct(
        addToCartRequestModel.current
      );

      let updatedQuantity: number = 0;
      if (!hasError && dataBody !== undefined) {
        let cartItemId: number | undefined;
        Object.values(dataBody.data.menuItems).map((menuItem) => {
          if (menuItem.id === menu?.id ?? 0) {
            cartItemId = menuItem.cart_item_id!;
            if (isUpdating) {
              if (menu?.have_modifiers) {
                updatedQuantity += menuItem.quantity;
              } else {
                updatedQuantity = stepperCount;
              }
            } else {
              updatedQuantity =
                Number(menu?.quantity ?? 0) + Number(stepperCount);
            }
          }
        });
        if (cartItemId) {
          onSuccessItemAdded(
            cartItemId,
            updatedQuantity,
            menu?.have_modifiers
              ? isUpdating
                ? stepperCount - menu.quantity
                : stepperCount
              : updatedQuantity - (menu?.quantity ?? 0)
          );
        }

        SimpleToast.show(dataBody.message);
        navigation.goBack();
        if (exclusiveOfferId) {
          navigation.navigate("MyCart", {
            isFrom: EScreen.VENUE_DETAIL,
            establishment_id:
              addToCartRequestModel.current.establishment_id,
            exclusive_id: addToCartRequestModel.current.exclusive_offer_id
          });
        }
      } else {
        SimpleToast.show(errorBody!);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [menu, grandTotal]
  );
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitleAlign: "center",
      headerLeft: () => (
        <HeaderLeftTextWithIcon
          icon={() => <Cross fill={COLORS.theme?.interface["500"]} />}
          onPress={() => navigation.goBack()}
          containerStyle={{ marginLeft: SPACE.lg }}
        />
      ),
      headerTitle: () => (
        <HeaderTitle text={menu?.name ?? modifiers?.[0].name ?? ""} />
      )
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, getBarMenusData]);

  const getComments = (comment: string) => {
    setComments(comment);
  };

  return (
    <MenuDetailView
      menu={menu!}
      modiferDetails={modifiers!}
      addToCart={addToCart}
      showProgressbar={loading || singleProductLoader}
      productType={productType}
      addToCartLoading={addToCartLoading}
      prevQuantity={quantity !== undefined ? quantity! : 1}
      isUpdating={isUpdating}
      calculatePrice={calculatePrice}
      calculatePriceForBundle={calculatePriceForBundle}
      totalBill={grandTotal}
      getComment={getComments}
      buttonText={
        exclusiveOfferId
          ? "Redeem Deal"
          : `${
              isUpdating
                ? Strings.venue_details.menu.updateToCart
                : Strings.venue_details.menu.addToCart
            }`
      }
      shouldDisbableStepper={exclusiveOfferId ? true : false}
    />
  );
};

export default MenuDetailController;
