import { COLORS, FONT_SIZE, SPACE } from "config";
import {
  ModifierDetails,
  ModifierGroup
} from "models/api_responses/ModifierDetailsResponseModel";
import React, { FC, useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  AppLabel,
  TEXT_TYPE
} from "ui/components/atoms/app_label/AppLabel";
import { FlatListWithPb } from "../flat_list/FlatListWithPb";
import NoRecordFound from "assets/images/tbc.svg";
import ItemModifierGroupContainer from "../item_modifier_group_container/ItemModifierGroupContainer";
import Checked from "assets/images/checkedButton.svg";
import UnChecked from "assets/images/unChecked.svg";
import { useAppSelector } from "hooks/redux";
import { RootState } from "stores/store";
import { Price } from "utils/Util";
import EProductGroupType from "models/enums/EProductGroupType";

type Props = {
  data: ModifierDetails;
  recalculatePrice: () => void;
  productType: EProductGroupType;
  groupType: EProductGroupType;
  shouldShowCheckButton: boolean;
  validateBundleProducts: (state: boolean, item: ModifierDetails) => void;
};

const ItemMenuContainer: FC<Props> = ({
  data,
  recalculatePrice,
  productType,
  groupType,
  shouldShowCheckButton,
  validateBundleProducts
}) => {
  const [isSelected, setIsSelected] = useState<boolean>(data.isSelected);
  const renderItem = useCallback(
    ({ item }: { item: ModifierGroup }) => {
      return (
        <ItemModifierGroupContainer
          modifiers={item}
          recalculatePrice={recalculatePrice}
          product={data}
        />
      );
    },
    [data, recalculatePrice]
  );

  const { regionData } = useAppSelector(
    (state: RootState) => state.general
  );

  return (
    <View style={[styles.container]}>
      {productType === EProductGroupType.BUNDLE && (
        <View style={[styles.itemTitleContainer]}>
          <AppLabel
            textType={TEXT_TYPE.SEMI_BOLD}
            style={[styles.title]}
            text={data.name}
          />
          {groupType === EProductGroupType.BUNDLE &&
            shouldShowCheckButton && (
              <View style={[styles.productPriceContainer]}>
                <AppLabel
                  textType={TEXT_TYPE.SEMI_BOLD}
                  style={[styles.productPrice]}
                  text={Price.toString(
                    regionData?.currency_symbol,
                    data.price
                  )}
                />
                <Pressable
                  style={[styles.selection]}
                  onPress={() => {
                    validateBundleProducts(!data.isSelected, data);
                    setIsSelected(!isSelected);
                  }}>
                  {data.isSelected ? (
                    <Checked
                      fill={COLORS.theme?.primaryColor}
                      style={{ marginRight: SPACE.lg }}
                    />
                  ) : (
                    <UnChecked style={{ marginRight: SPACE.lg }} />
                  )}
                </Pressable>
              </View>
            )}
        </View>
      )}
      {
        data.modifier_groups != null && (
          <FlatListWithPb
            data={data.modifier_groups}
            renderItem={renderItem}
            style={[styles.container]}
            noRecordFoundImage={
              <NoRecordFound width={"100%"} height={"44%"} />
            }
            keyExtractor={(item) => item.id.toString()}
          />
        )
        // : (
        //   <AppLabel
        //     style={[styles.emptyText]}
        //     text={"There are no modifiers for this product"}
        //     textType={TEXT_TYPE.SEMI_BOLD}
        //   />
        // )
      }
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: SPACE.sm
  },
  itemTitleContainer: {
    flex: 1,
    height: 50,
    backgroundColor: COLORS.theme?.primaryColor,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center"
  },
  title: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.white,
    marginLeft: SPACE._2md
  },
  emptyText: {
    alignSelf: "center",
    marginVertical: SPACE._2md
  },
  selection: {
    padding: 5,
    justifyContent: "center",
    alignItems: "center"
  },
  productPrice: {
    color: COLORS.white,
    fontSize: FONT_SIZE._2xs
  },
  productPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  }
});

export default ItemMenuContainer;
