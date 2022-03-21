import React, { FC, useCallback, useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  View,
  TextInput,
  Platform,
  KeyboardAvoidingView
} from "react-native";
import Screen from "ui/components/atoms/Screen";
import {
  AppLabel,
  TEXT_TYPE
} from "ui/components/atoms/app_label/AppLabel";
import { BarMenu, getAlergensIcon } from "models/BarMenu";
import { COLORS, FONT_SIZE, SPACE } from "config";
import { RootState } from "stores/store";
import { useAppSelector } from "hooks/redux";
import { Price } from "utils/Util";
import HTMLView from "react-native-htmlview";
import Strings from "config/Strings";
import { Stepper } from "ui/components/atoms/stepper/Stepper";
import { AppButton } from "ui/components/molecules/app_button/AppButton";
import { FlatListWithPb } from "ui/components/organisms/flat_list/FlatListWithPb";
import ItemMenuContainer from "ui/components/organisms/item_menu_container/ItemMenuContainer";
import NoRecordFound from "assets/images/tbc.svg";
import { ModifierDetails } from "models/api_responses/ModifierDetailsResponseModel";
import SimpleToast from "react-native-simple-toast";
import EProductGroupType from "models/enums/EProductGroupType";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  menu: BarMenu;
  modiferDetails: ModifierDetails[];
  addToCart: (grandTotal: number, stepperValue: number) => void;
  showProgressbar: boolean;
  productType: EProductGroupType;
  addToCartLoading: boolean;
  prevQuantity: number;
  isUpdating: boolean;
  calculatePrice: (stepperValue: number) => void;
  calculatePriceForBundle: (stepperValue: number) => void;
  totalBill: number;
  getComment: (comment: string) => void;
  shouldDisbableStepper?: boolean;
  buttonText: string;
};

export const MenuDetailView: FC<Props> = ({
  menu,
  modiferDetails,
  addToCart,
  showProgressbar,
  productType,
  addToCartLoading,
  prevQuantity,
  isUpdating,
  calculatePrice,
  totalBill,
  getComment,
  shouldDisbableStepper = false,
  buttonText,
  calculatePriceForBundle
}) => {
  const [comments, setComments] = useState<string | null>(
    menu && menu.comment !== undefined ? menu.comment : ""
  );

  const [commentsHeight, setCommentsHeight] = useState<number>(45);

  const { regionData } = useAppSelector(
    (state: RootState) => state.general
  );
  const [stepperValue, setStepperValue] = useState<number>(
    isUpdating ? menu && menu.quantity : 1
  );

  const [counter, setCounter] = useState<number>(0);

  const safeAreaInset = useSafeAreaInsets();

  const recalculatePrice = () => {
    setStepperValue((prev) => {
      if (menu.group_type === EProductGroupType.BUNDLE) {
        calculatePriceForBundle(prev);
      } else {
        calculatePrice(prev);
      }
      return prev;
    });
  };

  const validateBundleProducts = useCallback(
    (state: boolean, item: ModifierDetails) => {
      if (state) {
        let filtered = modiferDetails.filter((detail) => {
          return detail.isSelected;
        });
        if (filtered.length <= 1) {
          item.isSelected = true;
        } else {
          SimpleToast.show(
            "Please unselect any of the already selected items first"
          );
        }
      } else {
        item.isSelected = false;
        if (item.modifier_groups) {
          item.modifier_groups.map((group) => {
            group.modifiers?.map((modifier) => {
              modifier.isSelected = false;
              modifier.quantity = 0;
            });
          });
        }
      }
      recalculatePrice();
      increamentCounter();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modiferDetails]
  );

  const increamentCounter = () => {
    setCounter((prev) => prev + 1);
  };

  const renderItem = useCallback(
    ({ item, index }: { item: ModifierDetails; index: number }) => {
      return (
        <>
          {index === 0 && <>{renderTopView()}</>}
          <ItemMenuContainer
            data={item}
            recalculatePrice={recalculatePrice}
            productType={productType}
            groupType={menu.group_type}
            shouldShowCheckButton={
              modiferDetails && modiferDetails.length >= 2
            }
            validateBundleProducts={validateBundleProducts}
          />
        </>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [menu, modiferDetails, validateBundleProducts]
  );

  const renderTopView = () => {
    return (
      <>
        {menu && menu.image != null && (
          <View
            style={{
              marginHorizontal: SPACE.lg
            }}>
            <Image
              style={[styles.itemImage]}
              source={{ uri: menu?.image ?? "" }}
            />
          </View>
        )}
        <View style={[styles.itemNameContainer]}>
          <AppLabel
            style={[styles.itemName, { flex: 2 }]}
            text={menu?.name ?? ""}
            textType={TEXT_TYPE.BOLD}
            numberOfLines={1}
          />
          <View style={{ flex: 0.1 }} />
          {menu.group_type !== EProductGroupType.BUNDLE && (
            <AppLabel
              style={[styles.itemPrice]}
              text={Price.toString(
                regionData?.currency_symbol,
                menu?.price ?? 0
              )}
            />
          )}
        </View>
        {menu && menu.description != null && (
          <View style={[styles.descriptionContainer]}>
            <HTMLView value={menu?.description ?? ""} />
          </View>
        )}
        <View style={[styles.allergensContainer]}>
          <AppLabel
            style={[styles.allergensText]}
            text={Strings.venue_details.menu.allergens_caps}
            textType={TEXT_TYPE.BOLD}
          />
          <AppLabel
            style={[styles.allergensDetails]}
            text={
              menu.is_allergen
                ? menu.allergen_description
                : Strings.venue_details.menu.allergensUnavailable
            }
            textType={TEXT_TYPE.SEMI_BOLD}
            numberOfLines={0}
          />
          {menu.allergen_icons!.length > 0 && menu.is_allergen && (
            <FlatListWithPb
              data={menu.allergen_icons}
              renderItem={(item) => (
                <View
                  style={[
                    styles.iconContainer,
                    styles.allergensIcon,
                    { marginHorizontal: 3 }
                  ]}>
                  <Image
                    source={getAlergensIcon(item.item)}
                    style={[
                      styles.allergensIcon,
                      { height: 45, width: 45 }
                    ]}
                  />
                </View>
              )}
              shouldShowProgressBar={false}
              isAllDataLoaded={true}
              listKey="2"
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View />}
              numColumns={5}
              style={[styles.iconList]}
            />
          )}
        </View>
      </>
    );
  };

  useEffect(() => {
    if (menu?.group_type === EProductGroupType.BUNDLE) {
      calculatePriceForBundle(
        isUpdating ? menu?.quantity ?? 0 : stepperValue
      );
    } else {
      calculatePrice(isUpdating ? menu?.quantity ?? 0 : stepperValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardAvoidingView}>
      <Screen
        style={[styles.container]}
        shouldAddBottomInset={false}
        bottomSafeAreaColor={COLORS.theme?.secondaryBackground}>
        <View style={[styles.container]}>
          {modiferDetails === undefined ||
          (modiferDetails && modiferDetails.length > 0) ? (
            <FlatListWithPb
              data={modiferDetails}
              renderItem={renderItem}
              style={[styles.container]}
              shouldShowProgressBar={showProgressbar}
              nestedScrollEnabled={true}
              noRecordFoundImage={
                <NoRecordFound width={"70%"} height={"15%"} />
              }
              keyExtractor={(item) => item.id.toString()}
              extraData={counter}
            />
          ) : (
            renderTopView()
          )}
        </View>
        {showProgressbar === false && (
          <View style={[styles.bottomView]}>
            <View style={[styles.spacerView]} />
            <AppLabel
              style={[styles.commentsLabel]}
              text={Strings.venue_details.menu.addComments}
              textType={TEXT_TYPE.BOLD}
            />
            <TextInput
              placeholder={Strings.venue_details.menu.commentsPlaceholder}
              style={[
                styles.textFieldStyle,
                {
                  height: commentsHeight,
                  paddingTop: 12
                }
              ]}
              placeholderTextColor={COLORS.theme?.interface[500]}
              textAlignVertical={"top"}
              value={comments ?? ""}
              multiline={true}
              numberOfLines={3}
              onFocus={() => {
                setCommentsHeight(95);
              }}
              onBlur={() => {
                setCommentsHeight(45);
              }}
              onChangeText={(value) => {
                setComments(value);
                getComment(value);
              }}
            />
            <View
              style={[
                styles.stepperContainer,
                {
                  paddingBottom:
                    Platform.OS === "ios" && safeAreaInset.bottom === 0
                      ? SPACE.lg
                      : Platform.OS === "android"
                      ? SPACE.lg
                      : 0
                }
              ]}>
              <Stepper
                min={1}
                initialValue={
                  prevQuantity !== undefined ? prevQuantity : 1
                }
                shouldDisableLeftButton={shouldDisbableStepper}
                shouldDisableRightButton={shouldDisbableStepper}
                onValueChange={(value) => {
                  setStepperValue(value);
                  if (menu.group_type === EProductGroupType.BUNDLE) {
                    calculatePriceForBundle(value);
                  } else {
                    calculatePrice(value);
                  }
                }}
              />
              <View style={{ width: 15 }} />
              <AppButton
                shouldShowProgressBar={addToCartLoading}
                text={
                  buttonText +
                  " - " +
                  Price.toString(regionData?.currency_symbol, totalBill)
                }
                onPress={() => addToCart(totalBill, stepperValue)}
              />
            </View>
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  itemImage: {
    height: 200,
    width: "100%",
    alignSelf: "center",
    borderRadius: SPACE._2md,
    marginTop: SPACE._2xl
  },
  itemNameContainer: {
    marginHorizontal: SPACE.xl,
    marginTop: SPACE.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  itemName: {
    fontSize: FONT_SIZE.base
  },
  itemPrice: {
    fontSize: FONT_SIZE.xs
  },
  p: {
    fontSize: FONT_SIZE._3xs
  },
  descriptionContainer: {
    marginHorizontal: SPACE.xl,
    marginTop: 2
  },
  allergensContainer: {
    minHeight: 70,
    backgroundColor: COLORS.theme?.primaryColor,
    marginHorizontal: SPACE.lg,
    borderRadius: SPACE._2md,
    marginTop: SPACE._2md
  },
  allergensText: {
    color: COLORS.theme?.interface[100],
    fontSize: FONT_SIZE.xs,
    padding: SPACE.sm
  },
  allergensDetails: {
    fontSize: FONT_SIZE._2xs,
    padding: SPACE._2md,
    paddingTop: 0,
    color: COLORS.white
  },
  spacerView: {
    backgroundColor: COLORS.theme?.interface[300],
    height: 1,
    width: "100%"
  },
  bottomView: {
    bottom: 0
  },
  commentsLabel: {
    color: COLORS.black,
    marginLeft: SPACE._2md,
    marginTop: SPACE._2md,
    fontSize: FONT_SIZE._3xs
  },
  textFieldStyle: {
    marginHorizontal: SPACE._2md,
    marginTop: SPACE._2md,
    backgroundColor: COLORS.theme?.interface[200],
    borderRadius: SPACE._2md,
    height: 90,
    color: COLORS.black,
    paddingLeft: SPACE._2md
  },
  stepperContainer: {
    paddingRight: 80,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: SPACE._2lg,
    marginTop: SPACE._2md,
    alignItems: "center"
  },
  keyboardAvoidingView: {
    flex: 1
  },
  allergensIcon: {
    marginTop: SPACE.sm,
    marginHorizontal: SPACE.xs,
    marginBottom: SPACE.xs
  },
  iconList: {
    marginBottom: SPACE.sm,
    backgroundColor: COLORS.white,
    borderRadius: SPACE._2md,
    paddingBottom: SPACE.xs,
    marginHorizontal: 10
  },
  iconContainer: {
    height: 55,
    width: 55,
    borderWidth: 2,
    borderColor: COLORS.theme?.primaryColor,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center"
  }
});
