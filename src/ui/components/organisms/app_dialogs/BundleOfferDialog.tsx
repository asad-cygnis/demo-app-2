import { Offer } from "models/Offer";
import Strings from "config/Strings";
import React from "react";
import { usePreferredTheme } from "hooks";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { COLORS, FONT_SIZE, SPACE } from "config";
import {
  AppLabel,
  TEXT_TYPE
} from "ui/components/atoms/app_label/AppLabel";
import Colors from "config/Colors";
import HTMLView from "react-native-htmlview";
import { AppLog, TAG } from "utils/Util";

type Props = {
  offer: Offer;
};

export const getMilesAwayText = (offer: Offer) => {
  if (offer?.establishments?.distance === 1) {
    return Strings.edits.mile_away;
  } else {
    return Strings.edits.miles_away;
  }
};

const BundleOfferDialog = React.memo<Props>(({ offer }) => {
  const theme = usePreferredTheme();
  AppLog.log(() => "imageUrl: " + offer.image, TAG.VENUE);

  return (
    <View>
      <View style={styles.container}>
        <Image
          source={
            offer.image !== null
              ? { uri: offer.image }
              : require("assets/images/cart_placeholder.png")
          }
          style={styles.image}
          resizeMode={"cover"}
        />
        <AppLabel
          text={offer.name}
          style={[
            styles.title,
            { color: theme.themedColors.primaryColor }
          ]}
          textType={TEXT_TYPE.BOLD}
        />
        {/*<AppLabel*/}
        {/*  text={offer.title}*/}
        {/*  style={styles.subTitle}*/}
        {/*  textType={TEXT_TYPE.BOLD}*/}
        {/*/>*/}
        <Pressable
          onPress={() => null}
          style={styles.decsriptionViewMoreContainer}>
          {/*<AppLabel*/}
          {/*  text={offer.description}*/}
          {/*  style={styles.longDesc}*/}
          {/*  numberOfLines={NUM_OF_LINES}*/}
          {/*/>*/}
          <View style={styles.longDesc}>
            <HTMLView value={offer.description ?? ""} />
          </View>
        </Pressable>
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 15,
    marginHorizontal: 20,
    elevation: 1
  },
  title: {
    alignSelf: "center",
    fontSize: FONT_SIZE._3xs,
    paddingTop: SPACE._2xl
  },
  subTitle: {
    alignSelf: "center",
    fontSize: FONT_SIZE.base,
    color: Colors.colors.black
  },
  longDesc: {
    alignSelf: "center",
    fontSize: FONT_SIZE._2xs,
    paddingRight: SPACE._2xl,
    paddingLeft: SPACE._2xl,
    justifyContent: "center",
    textAlign: "center",
    marginTop: SPACE.md
  },
  shortDesc: {
    alignSelf: "center",
    fontSize: FONT_SIZE._2xs,
    paddingTop: SPACE.lg
  },
  location: {
    alignSelf: "center",
    fontSize: FONT_SIZE._3xs,
    paddingLeft: SPACE._2xs,
    paddingTop: SPACE.xs
  },
  image: {
    width: "100%",
    height: 150,
    borderTopRightRadius: 15,
    borderTopLeftRadius: 15
  },
  shareIcon: {
    marginTop: SPACE.lg
  },
  iconsContainer: {
    position: "absolute",
    right: SPACE.lg,
    top: SPACE.lg
  },
  startButton: {
    marginTop: SPACE.lg
  },

  decsriptionViewMoreContainer: {
    height: 70
    //marginBottom: SPACE.lg
  },
  timerText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.white
  }
});

export default BundleOfferDialog;
