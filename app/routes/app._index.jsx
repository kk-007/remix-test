import { Fragment, useMemo, useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  VerticalStack,
  Card,
  Button,
  LegacyCard,
  Tabs,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

const tabs = [
  {
    id: "home",
    content: "Home Page",
  },
  {
    id: "collection",
    content: "Collection Page",
  },
  {
    id: "product",
    content: "Product Page",
  },
];

function generateRandomString(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  const themes = await admin.rest.resources.Theme.all({
    session,
  });

  const mainTheme = themes.data.find((theme) => theme.role === "main");

  const { data: assetsData } = await admin.rest.resources.Asset.all({
    session,
    theme_id: mainTheme?.id,
  });

  const home = assetsData.filter((asset) =>
    asset.key?.startsWith("templates/index.")
  );
  const product = assetsData.filter((asset) =>
    asset.key?.startsWith("templates/product.")
  );
  const collection = assetsData.filter((asset) =>
    asset.key?.startsWith("templates/collection.")
  );

  return json({ data: { home, product, collection } });
};

export const action = async ({ request }) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const formData = await request.formData();

    const key = formData.get("key");
    const themeId = formData.get("theme_id");

    const { data } = await admin.rest.resources.Asset.all({
      session,
      theme_id: themeId,
      asset: {
        key,
      },
    });

    const orignalAsset = data[0];

    const splittedKey = (orignalAsset.key || "").split(".");
    const newKey = `${splittedKey[0]}.${generateRandomString(10)}.${
      splittedKey.slice(-1)[0]
    }`;

    const asset = new admin.rest.resources.Asset({ session });
    asset.theme_id = +themeId;
    asset.key = newKey;
    asset.source_key = orignalAsset.key;

    console.log("session", session);
    console.log("asset", asset);

    await asset.save({
      update: true,
    });

    // TODO: Complete this function to duplicate the selected asset
    // by creating a new asset with a random key and the same content.
    // format should be if homepage then index.{random10-characters-key}.liquid, collection then collection.{random10-characters-key}.liquid, product then product.{random10-characters-key}.liquid

    return json({ status: "success", orignalAsset, newKey, asset });
  } catch (error) {
    console.log("error", error);
    console.log("json error", JSON.stringify(error, null, 2));
    return json({ status: "fail", error: error });
  }
};

export default function Index() {
  const loaderData = useLoaderData();
  console.log("loaderData", loaderData);

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const submit = useSubmit();
  const [isLoading, setIsLoading] = useState(false);

  const { home, product, collection } = useMemo(
    () => loaderData.data,
    [loaderData]
  );

  const assets = useMemo(() => {
    const assetsForActiveTab =
      selectedTabIndex === 0
        ? home
        : selectedTabIndex === 1
        ? product
        : collection;
    return Array.isArray(assetsForActiveTab) ? assetsForActiveTab : [];
  }, [selectedTabIndex, home, product, collection]);

  const handleSelect = (asset) => {
    setSelectedAsset(asset);
  };

  const handleDuplicate = async () => {
    // TODO: Complete this function to submit the form with the selected asset key and theme ID.
    setIsLoading(true);

    try {
      await submit(selectedAsset, {
        method: "POST",
      });
    } catch (error) {
      console.log("error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCard = (asset) => {
    return (
      <Card>
        <div
          style={{
            border:
              selectedAsset?.key === asset.key
                ? "2px solid green"
                : "2px solid black",
            margin: "5px 10px",
            padding: "12px",
            cursor: "pointer",
          }}
          onClick={() => handleSelect(asset)}
        >
          <VerticalStack>
            <Text as="span">Asset Key: {asset.key}</Text>
            <Text as="span">Theme ID: {asset.theme_id}</Text>
            <Text as="span">Updated At: {asset.updated_at}</Text>
          </VerticalStack>
        </div>
      </Card>
    );
  };

  // TODO: Create the Tabs and Panels components and render the assets inside the Panels.

  return (
    <Page>
      <ui-title-bar title="Remix app template"></ui-title-bar>
      <VerticalStack gap="5">
        <Layout>
          <Layout.Section>
            <LegacyCard>
              <Tabs
                tabs={tabs}
                selected={selectedTabIndex}
                onSelect={(index) => {
                  setSelectedAsset(null);
                  setSelectedTabIndex(index);
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                    padding: "5px",
                  }}
                >
                  {assets.map((asset) => (
                    <Fragment key={asset.checksum}>
                      {renderCard(asset)}
                    </Fragment>
                  ))}
                </div>
              </Tabs>
            </LegacyCard>
          </Layout.Section>
        </Layout>
        <form method="post">
          <Button
            primary
            disabled={!selectedAsset}
            onClick={handleDuplicate}
            loading={isLoading}
          >
            Duplicate Template
          </Button>
        </form>
      </VerticalStack>
    </Page>
  );
}
