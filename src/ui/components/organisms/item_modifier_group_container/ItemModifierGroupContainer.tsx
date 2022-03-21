import { COLORS, FONT_SIZE, SPACE } from "config";
import {
  ModifierDetails,
  ModifierGroup
} from "models/api_responses/ModifierDetailsResponseModel";
import React, { FC, useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  AppLabel,
  TEXT_TYPE
} from "ui/components/atoms/app_label/AppLabel";
import { FlatListWithPb } from "../flat_list/FlatListWithPb";
import NoRecordFound from "assets/images/tbc.svg";
import ItemModifierContainer from "../item_modifier_container/ItemModifierContainer";

type Props = {
  modifiers: ModifierGroup;
  recalculatePrice: () => void;
  product: ModifierDetails;
};

const ItemModifierGroupContainer: FC<Props> = ({
  modifiers,
  recalculatePrice,
  product
}) => {
  const [finalData, setFinalData] = useState<ModifierGroup[] | undefined>(
    []
  );
  const [counter, setCounter] = useState<number>(0);

  useEffect(() => {
    modifiers.modifiers?.map((item) => {
      validateDataForStepperView(
        item,
        item.quantity !== undefined ? item.quantity! : 0
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateData = useCallback(
    (item: ModifierGroup, isSelected: boolean) => {
      let selectedQuantity = fetchModifierQuantity(modifiers);
      if (modifiers.max! === 1) {
        if (item.isSelected) {
          if (modifiers.max! === 1) {
            if (modifiers.min! === 0) {
              item.isSelected = false;
              item.quantity = 0;
            }
          }
        } else {
          modifiers.modifiers!.forEach((modifier) => {
            if (modifier.id === item.id) {
              item.isSelected = true;
              item.quantity = 1;
            } else {
              modifier.isSelected = false;
              modifier.quantity = 0;
            }
          });
        }
      } else {
        if (isSelected) {
          if (modifiers.max! <= 1 || selectedQuantity < modifiers.max!) {
            item.isSelected = true;
            item.quantity = 1;
            selectedQuantity = fetchModifierQuantity(modifiers);
            if (selectedQuantity < modifiers.max!) {
              modifiers.isLeftButtonDisabled = false;
            } else {
              modifiers.isLeftButtonDisabled = true;
            }

            if (selectedQuantity === 1 && modifiers.min! > 0) {
              modifiers.isRightButtonDisabled = true;
            } else {
              modifiers.isRightButtonDisabled = false;
            }
            // modifiers.isLeftButtonDisabled = false;
            // modifiers.isRightButtonDisabled = false;
            finalData!.push(item);
            setFinalData(finalData);
            recalculatePrice();
            if (fetchSelectedModifierCount(modifiers)! > 1) {
              validateDataForStepperView(item, 1);
            }
          }
        } else {
          if (fetchSelectedModifierCount(modifiers)! > modifiers.min!) {
            item.isSelected = false;
            item.quantity = 0;
            setFinalData(
              finalData?.filter((data) => {
                return data.modifier_id !== item.modifier_id;
              })
            );
            recalculatePrice();
            validateDataForStepperView(item, 0);
          }
        }
      }
      increamentCounter();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const fetchSelectedModifierCount = (group: ModifierGroup) => {
    return group.modifiers?.filter((data) => {
      return data.isSelected !== undefined && data.isSelected !== false;
    }).length;
  };

  const fetchModifierQuantity = (group: ModifierGroup) => {
    let total = 0;
    group.modifiers?.map((data) => {
      total += data.isSelected ? data.quantity! : 0;
    });
    group.selectedModifiersQuantity = total;
    return total;
  };

  const validateDataForStepperView = useCallback(
    (item: ModifierGroup, value: number) => {
      let preservedQuantity = item.quantity;
      if (
        value > 0 ||
        fetchSelectedModifierCount(modifiers)! > modifiers.min!
      ) {
        item.quantity = value;
      }

      let selectedQuantity = fetchModifierQuantity(modifiers);
      if (selectedQuantity > modifiers.max!) {
        item.quantity = preservedQuantity;
      }

      item.isSelected = item.quantity! > 0;
      if (selectedQuantity < modifiers.max!) {
        modifiers.isLeftButtonDisabled = false;
      } else {
        modifiers.isLeftButtonDisabled = true;
      }

      if (selectedQuantity === 1 && modifiers.min! > 0) {
        modifiers.isRightButtonDisabled = true;
      } else {
        modifiers.isRightButtonDisabled = false;
      }

      recalculatePrice();
      increamentCounter();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const increamentCounter = () => {
    setCounter((prev) => prev + 1);
  };

  const renderItem = useCallback(
    ({ item }: { item: ModifierGroup }) => {
      return (
        <ItemModifierContainer
          modifiers={item}
          max={modifiers.max!}
          multiMax={modifiers.multi_max!}
          validateData={validateData}
          validateDataForStepperView={validateDataForStepperView}
          group={modifiers}
          recalculatePrice={recalculatePrice}
          product={product}
        />
      );
    },

    [
      modifiers,
      product,
      recalculatePrice,
      validateData,
      validateDataForStepperView
    ]
  );
  return (
    <View style={[styles.container]}>
      <View style={[styles.topNameContainer]}>
        <View style={[styles.leftContainerView]}>
          <AppLabel
            style={[styles.name]}
            text={modifiers.name}
            numberOfLines={2}
          />
          {modifiers.max! > 1 && (
            <AppLabel
              style={[styles.minCount]}
              text={`Choose upto ${modifiers.max}`}
            />
          )}
        </View>
        {modifiers.min! > 0 && (
          <View style={[styles.rightContainerView]}>
            <View style={[styles.requiredContainer]}>
              <AppLabel
                style={[styles.requiredText]}
                textType={TEXT_TYPE.BOLD}
                text={"REQUIRED"}
              />
            </View>
          </View>
        )}
      </View>
      <FlatListWithPb
        data={modifiers.modifiers}
        renderItem={renderItem}
        style={[styles.container]}
        noRecordFoundImage={<NoRecordFound width={"70%"} height={"15%"} />}
        contentContainerStyle={[
          {
            // paddingBottom: SPACE.lg
          }
        ]}
        keyExtractor={(item) => item.id.toString()}
        extraData={counter}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.theme?.interface[200],
    marginHorizontal: SPACE.md,
    borderRadius: SPACE._2md,
    overflow: "hidden",
    marginBottom: SPACE.md
  },
  topNameContainer: {
    flex: 1,
    backgroundColor: COLORS.theme?.primaryShade[600],
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: SPACE.sm
  },
  name: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    alignSelf: "flex-start"
  },
  minCount: {
    fontSize: FONT_SIZE._2xs,
    color: COLORS.white,
    alignSelf: "flex-start"
  },
  leftContainerView: {
    marginLeft: SPACE._2md,
    alignItems: "center",
    justifyContent: "center",
    flex: 1
  },
  rightContainerView: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACE._2md
  },
  requiredContainer: {
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.md,
    backgroundColor: COLORS.theme?.interface[300],
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  requiredText: {
    fontSize: FONT_SIZE._2xs,
    color: COLORS.red
  }
});

export default ItemModifierGroupContainer;
