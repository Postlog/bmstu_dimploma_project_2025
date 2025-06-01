const CODE_SAMPLES = {
Go: `package dicts_parameters

import (
"context"
"encoding/json"
"errors"
"fmt"
"reflect"
"strconv"
"sync"
"testing"
"time"

"github.com/golang/mock/gomock"
"github.com/stretchr/testify/assert"
"github.com/stretchr/testify/require"
accountsHierarchy "go.avito.ru/av/service-publish-item-api/internal/clients/accounts_hierarchy_employees"
draftStorage "go.avito.ru/av/service-publish-item-api/internal/clients/draft_storage"
infomodelClient "go.avito.ru/av/service-publish-item-api/internal/clients/infomodel"
itemPlatform "go.avito.ru/av/service-publish-item-api/internal/clients/item_platform"
"go.avito.ru/av/service-publish-item-api/internal/clients/moderation"
sellerAddresses "go.avito.ru/av/service-publish-item-api/internal/clients/seller_addresses"
tariffAggregator "go.avito.ru/av/service-publish-item-api/internal/clients/tariff_aggregator"
userLimits "go.avito.ru/av/service-publish-item-api/internal/clients/user_limits"
userProfile "go.avito.ru/av/service-publish-item-api/internal/clients/user_profile"
"go.avito.ru/av/service-publish-item-api/internal/clients/vas"
navigationManager "go.avito.ru/av/service-publish-item-api/internal/components/navigation/manager"
rejectionInfoGetter "go.avito.ru/av/service-publish-item-api/internal/core/moderation/rejection_info_getter"
profileCore "go.avito.ru/av/service-publish-item-api/internal/core/profile"
"go.avito.ru/av/service-publish-item-api/internal/dicts"
friendlyError "go.avito.ru/av/service-publish-item-api/internal/error/friendly"
"go.avito.ru/av/service-publish-item-api/internal/generated/api/schema/components"
schemaComponents "go.avito.ru/av/service-publish-item-api/internal/generated/api/schema/components"
abBrief "go.avito.ru/av/service-publish-item-api/internal/generated/rpc/clients/address_book"
infomodelValidation "go.avito.ru/av/service-publish-item-api/internal/generated/rpc/clients/infomodel_validation"
itemPlatformBrief "go.avito.ru/av/service-publish-item-api/internal/generated/rpc/clients/item_platform"
dictsParameters "go.avito.ru/av/service-publish-item-api/internal/models/dicts_parameters"
infomodelModel "go.avito.ru/av/service-publish-item-api/internal/models/infomodel"
"go.avito.ru/av/service-publish-item-api/internal/models/slot"
avito "go.avito.ru/gl/dict-interfaces/attribute/avito/AVITO"
dictInterfaces "go.avito.ru/gl/dict-interfaces/attribute/avito/AVITO"
"go.avito.ru/gl/dict-interfaces/category"
"go.avito.ru/gl/dict-interfaces/location"
infomodel "go.avito.ru/gl/infomodel-client/v18"
"go.avito.ru/gl/logger/v3"
"go.avito.ru/gl/publish-item-dicts/operations"
dictParams "go.avito.ru/gl/publish-item-dicts/params"
"go.avito.ru/gl/publish-item-dicts/resolving"
contactInfoSlot "go.avito.ru/gl/publish-item-horizontals/slots/contact_info"
editCategorySlot "go.avito.ru/gl/publish-item-horizontals/slots/edit_category"
paramsProcessedModels "go.avito.ru/gl/publish-item-infomodel/models"
)

func TestDictsParameters_ProcessAdd_Success(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(123)
userSegments := map[string]interface{}{
	"segmentationSlug": "segmentSlug",
}
data := Data{
	UserID: userID,
	UserData: components.DictsParametersRequestForm{
		Navigation: components.Navigation{
			CategoryId: operations.Pointer(int64(category.AnimalsAqua)),
			Group:      operations.Pointer("group"),
			Attributes: []components.NavigationAttributesItem{
				{
					Id:    int64(1),
					Value: int64(4),
				},
				{
					Id:    int64(2),
					Value: int64(5),
				},
			},
			Config: &components.NavigationConfig{
				Branch: operations.Pointer("branch"),
				Tree:   operations.Pointer("tree"),
				Layout: operations.Pointer(resolving.PlatformAndroidCreationLayout),
			},
		},
		Params: map[string]interface{}{
			"1":               12,
			"3":               6,
			"[{\"1\":12345}]": "[{\"1\":12345}]",
		},
		PublishSessionId: operations.Pointer("sessionId"),
	},
	Platform: resolving.PlatformMAV,
}

draftStorageMock := NewMockDraftStorage(ctrl)
draftStorageMock.EXPECT().GetShouldSaveDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(true)

draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
userProfileMock := NewMockUserProfile(ctrl)
userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
	Return(
		&userProfile.User{
			ID:        int64(123),
			IsCompany: operations.Pointer(true),
		}, nil)
accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
nav := NewMockNavigationManager(ctrl)
nav.EXPECT().FindExactNode(
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
).Return(&infomodel.NavigationsNode{
	Config: infomodel.NavigationsNodeConfig{
		Category: operations.Pointer[int64](category.RealEstateFlats),
	},
}, nil)
nav.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
	Return(&infomodel.NavigationsNode{}, nil)
nav.EXPECT().GetCategoryByID(gomock.Any(), gomock.Any(), gomock.Any()).Return(&infomodelModel.Category{Slug: "slug"}, nil).AnyTimes()
nav.EXPECT().GetVerticalCategory(gomock.Any(), gomock.Any(), gomock.Any()).Return(&infomodelModel.Category{Slug: "parentSlug"}, nil).AnyTimes()
nav.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
nav.EXPECT().GetChainOfNavNames(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil).AnyTimes()
nav.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)

eventSenderMock := NewMockEventSender(ctrl)
eventSenderMock.EXPECT().ItemDraftAddStart(gomock.Any(), gomock.Any()).AnyTimes()
eventSenderMock.EXPECT().ItemAddCategoryStructureLastClick(gomock.Any(), gomock.Any()).AnyTimes()

tariffAggregatorMock := NewMockTariffAggregator(ctrl)
tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).AnyTimes().Return(false, nil)

sellerAddressesMock := NewMockSellerAddressesClient(ctrl)
sellerAddressesMock.EXPECT().GetSellerAddressesCount(gomock.Any(), gomock.Any()).AnyTimes().Return(int64(0), nil)

compositionMock := NewMockComposition(ctrl)
frMock := NewMockFeatureRegistry(ctrl)
frMock.EXPECT().Check(gomock.Any()).Return(false).AnyTimes()
compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)
compositionMock.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
compositionMock.EXPECT().GetV5FormBuild(gomock.Any(), gomock.Any()).
	Return(
		&infomodelValidation.FormResponseV5{
			Steps: nil,
			Slots: nil,
			Form: []infomodelValidation.FormFieldV2Response{
				{
					Data: infomodelValidation.FormFieldResponseData{
						Id: avito.CatalogUid110839,
						Value: &infomodelValidation.FormFieldValue{
							String: operations.Pointer("99991234567"),
						},
					},
				},
			},
		},
		nil,
	)
compositionMock.EXPECT().AppendInfomodelCatalogValues(gomock.Any(), gomock.Any(), "", "99991234567", gomock.Any())
formManagerMock := NewMockFormManager(ctrl)
formManagerMock.EXPECT().ModifyFormBeforeBuild(gomock.Any(), gomock.Any()).Return(nil)
formManagerMock.EXPECT().ModifyFormAfterBuild(gomock.Any(), gomock.Any()).Return(nil)
compositionMock.EXPECT().
	GetInfomodelVersion(gomock.Any(), gomock.Any()).
	Return(infomodelClient.LatestVersion).
	AnyTimes()
geoMock := NewMockCoreGeo(ctrl)

actionsMock := NewMockPublishItemActions(ctrl)
actionsMock.EXPECT().
	GetSlots(
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
	).
	Return([]slot.Slot{}, nil)

userLimitsMock := NewMockUserLimits(ctrl)

vasMock := NewMockVas(ctrl)

paramsProcessorMock := NewMockParamsProcessor(ctrl)
paramsProcessorMock.EXPECT().GetParams(
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
).Return([]paramsProcessedModels.ProcessedParam{{ID: 123}}, nil)

gorelkinMock := NewMockGorelkin(ctrl)
gorelkinMock.EXPECT().ProcessSteps(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)

itemPlatformMock := NewMockItemPlatformClient(ctrl)
itemPlatformExpanderMock := NewMockItemPlatformExpander(ctrl)
itemPlatformExpanderMock.EXPECT().Expand(gomock.Any(), gomock.Any()).Return(nil)

profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)

metricsMock := NewMockMetrics(ctrl)
hybridCacheMock := NewMockHybridCache(ctrl)
hybridCacheMock.EXPECT().Get(gomock.Any()).Return(nil, false).Times(1)
hybridCacheMock.EXPECT().Put(gomock.Any(), gomock.Any()).Times(1)
healthMetrics := NewPublishHealthMetrics(metricsMock, hybridCacheMock)
metricsMock.
	EXPECT().
	TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
	AnyTimes()

catalogsMock := NewMockCatalogs(ctrl)

togglesManager := NewMockTogglesManager(ctrl)
togglesManager.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)
togglesManager.EXPECT().GetBool("sellerx_dicts_parameters_parse_params_v2").Return(true, nil)

log, _ := logger.New(logger.WithEnabled(false))
dictsParams := New(
	log,
	draftHashVerifierMock,
	NewMockSessionIDGenerator(ctrl),
	draftStorageMock,
	userProfileMock,
	accountsHierarchyMock,
	nav,
	eventSenderMock,
	sellerAddressesMock,
	NewMockAddressBookClient(ctrl),
	tariffAggregatorMock,
	compositionMock,
	formManagerMock,
	actionsMock,
	geoMock,
	userLimitsMock,
	vasMock,
	paramsProcessorMock,
	gorelkinMock,
	NewMockGeoResolver(ctrl),
	itemPlatformMock,
	itemPlatformExpanderMock,
	profileCoreInstanceMock,
	togglesManager,
	healthMetrics,
	NewMockRejectionInfoGetterInterface(ctrl),
	catalogsMock,
)
_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

assert.NoError(t, err)
}

func TestDictsParameters_ProcessEdit_Success(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(123)
userSegments := map[string]interface{}{
	"segmentationSlug": "segmentSlug",
}
itemID := int64(890)
params := map[string]interface{}{
	"7":               10,
	"8":               11,
	"[{\"1\":12345}]": "[{\"1\":12345}]",
	strconv.Itoa(avito.IdentifikatoryAdresov110064): []interface{}{123},
	fmt.Sprint(avito.CatalogUid110839):              "1234567999",
}

data := Data{
	UserID: userID,
	UserData: components.DictsParametersRequestForm{
		ItemId: operations.Pointer[int64](itemID),
		Navigation: components.Navigation{
			CategoryId: operations.Pointer[int64](int64(category.AnimalsAqua)),
			Group:      operations.Pointer("group"),
			Attributes: []components.NavigationAttributesItem{
				{
					Id:    int64(1),
					Value: int64(4),
				},
				{
					Id:    int64(2),
					Value: int64(5),
				},
			},
			Config: &components.NavigationConfig{
				Branch: operations.Pointer("branch"),
				Tree:   operations.Pointer("tree"),
				Layout: operations.Pointer(resolving.PlatformAndroidEditLayout),
			},
		},
		Params: map[string]interface{}{},
	},
	Platform: resolving.PlatformMAV,
}

draftStorageMock := NewMockDraftStorage(ctrl)
draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
userProfileMock := NewMockUserProfile(ctrl)
userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
	Return(
		&userProfile.User{
			ID:        int64(123),
			IsCompany: operations.Pointer(true),
		}, nil)
accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
nav := NewMockNavigationManager(ctrl)
nav.EXPECT().FindExactNode(
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
).Return(&infomodel.NavigationsNode{
	Config: infomodel.NavigationsNodeConfig{
		Category: operations.Pointer[int64](category.RealEstateFlats),
	},
}, nil)
nav.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
	Return(&infomodel.NavigationsNode{}, nil)
nav.EXPECT().GetCategoryByID(gomock.Any(), gomock.Any(), gomock.Any()).Return(&infomodelModel.Category{Slug: "slug"}, nil).AnyTimes()
nav.EXPECT().GetVerticalCategory(gomock.Any(), gomock.Any(), gomock.Any()).Return(&infomodelModel.Category{Slug: "parentSlug"}, nil).AnyTimes()
nav.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
nav.EXPECT().GetChainOfNavNames(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil).AnyTimes()

nav.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)

eventSenderMock := NewMockEventSender(ctrl)
eventSenderMock.EXPECT().ItemAddCategoryStructureLastClick(gomock.Any(), gomock.Any()).AnyTimes()
eventSenderMock.EXPECT().ItemDraftAddStart(gomock.Any(), gomock.Any()).AnyTimes()

tariffAggregatorMock := NewMockTariffAggregator(ctrl)
tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).Return(false, nil).AnyTimes()
tariffAggregatorMock.EXPECT().GetTariffByUserID(gomock.Any(), gomock.Any()).Return(nil, nil).AnyTimes()

compositionMock := NewMockComposition(ctrl)
compositionMock.EXPECT().
	GetInfomodelVersion(gomock.Any(), gomock.Any()).
	Return(infomodelClient.LatestVersion).
	AnyTimes()
frMock := NewMockFeatureRegistry(ctrl)
frMock.EXPECT().Check(gomock.Any()).Return(true).AnyTimes()
compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)
compositionMock.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
compositionMock.EXPECT().GetV5FormBuild(gomock.Any(), gomock.Any()).
	Return(
		&infomodelValidation.FormResponseV5{
			Steps: nil,
			Slots: nil,
			Form: []infomodelValidation.FormFieldV2Response{
				{
					Data: infomodelValidation.FormFieldResponseData{
						Id: avito.CatalogUid110839,
						Value: &infomodelValidation.FormFieldValue{
							String: operations.Pointer("99991234567"),
						},
					},
				},
			},
		},
		nil,
	)
compositionMock.EXPECT().AppendInfomodelCatalogValues(gomock.Any(), gomock.Any(), "1234567999", "99991234567", gomock.Any())
formManagerMock := NewMockFormManager(ctrl)
formManagerMock.EXPECT().ModifyFormBeforeBuild(gomock.Any(), gomock.Any()).Return(nil)
formManagerMock.EXPECT().ModifyFormAfterBuild(gomock.Any(), gomock.Any()).Return(nil)

geoMock := NewMockCoreGeo(ctrl)
geoMock.EXPECT().IsNeedCheckAddressQuality(gomock.Any(), gomock.Any(), gomock.Any()).Return(true)
geoMock.EXPECT().IsAddressQualitative(gomock.Any(), gomock.Any(), gomock.Any()).
	Return(false, nil)

actionsMock := NewMockPublishItemActions(ctrl)
actionsMock.EXPECT().
	GetSlots(
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
	).
	Return([]slot.Slot{}, nil)

userLimitsMock := NewMockUserLimits(ctrl)
vasMock := NewMockVas(ctrl)
vasMock.EXPECT().GetActiveVas(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)

paramsProcessorMock := NewMockParamsProcessor(ctrl)
paramsProcessorMock.EXPECT().GetParams(
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
).Return([]paramsProcessedModels.ProcessedParam{{ID: 123}}, nil)

gorelkinMock := NewMockGorelkin(ctrl)
gorelkinMock.EXPECT().ProcessSteps(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)

itemPlatformMock := NewMockItemPlatformClient(ctrl)
rawCollection, _ := json.Marshal(params)
itemPlatformMock.EXPECT().GetByID(gomock.Any(), gomock.Eq(itemID), gomock.Eq(itemPlatform.ParamCollectionPublish)).
	Return(
		&itemPlatform.Item{
			ID:            itemID,
			StatusID:      operations.Pointer[int64](itemPlatformBrief.STATUSES_EXPIRED),
			UserID:        operations.Pointer[int64](123),
			CategoryID:    operations.Pointer[int64](category.RealEstateFlats),
			LocationID:    operations.Pointer[int64](int64(location.MoscowRegion)),
			Params:        params,
			RawCollection: rawCollection,
			Mu:            &sync.RWMutex{},
		}, nil)
itemPlatformExpanderMock := NewMockItemPlatformExpander(ctrl)

profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
metricsMock := NewMockMetrics(ctrl)
healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))

metricsMock.
	EXPECT().
	TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
	AnyTimes()

togglesManager := NewMockTogglesManager(ctrl)
togglesManager.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)
togglesManager.EXPECT().GetBool("sellerx_dicts_parameters_parse_params_v2").Return(true, nil)

catalogsMock := NewMockCatalogs(ctrl)

sellerAddressesMock := NewMockSellerAddressesClient(ctrl)
sellerAddressesMock.EXPECT().GetSellerAddressesCount(gomock.Any(), gomock.Any()).
	Return(int64(123), nil)
addressBookMock := NewMockAddressBookClient(ctrl)
addressBookMock.EXPECT().GetSellerAddressByUserIDAndAddressID(gomock.Any(), int64(123), int64(123)).
	Return(&abBrief.GetSellerAddressByOut{
		SellerAddressId:   456,
		SellerAddressName: "some address",
		IsDisabled:        false,
	}, nil)

log, _ := logger.New(logger.WithEnabled(false))
dictsParams := New(
	log,
	draftHashVerifierMock,
	NewMockSessionIDGenerator(ctrl),
	draftStorageMock,
	userProfileMock,
	accountsHierarchyMock,
	nav,
	eventSenderMock,
	sellerAddressesMock,
	addressBookMock,
	tariffAggregatorMock,
	compositionMock,
	formManagerMock,
	actionsMock,
	geoMock,
	userLimitsMock,
	vasMock,
	paramsProcessorMock,
	gorelkinMock,
	NewMockGeoResolver(ctrl),
	itemPlatformMock,
	itemPlatformExpanderMock,
	profileCoreInstanceMock,
	togglesManager,
	healthMetrics,
	NewMockRejectionInfoGetterInterface(ctrl),
	catalogsMock,
)
_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

assert.NoError(t, err)
}

func TestDictsParameters_Process_WysiwygError(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(43)
data := Data{
	UserID: userID,
	UserData: components.DictsParametersRequestForm{
		PublishSessionId: operations.Pointer("sessionId"),
	},
	Platform: resolving.PlatformMAV,
}

draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
draftStorageMock := NewMockDraftStorage(ctrl)
userProfileMock := NewMockUserProfile(ctrl)
userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
	Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil)
accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
nav := NewMockNavigationManager(ctrl)
eventSenderMock := NewMockEventSender(ctrl)
tariffAggregatorMock := NewMockTariffAggregator(ctrl)
tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).
	Return(false, tariffAggregator.ErrDefault)

frMock := NewMockFeatureRegistry(ctrl)
frMock.EXPECT().Check(gomock.Any()).Return(false).Times(1)
compositionMock := NewMockComposition(ctrl)
compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)

profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
compositionMock.EXPECT().
	GetInfomodelVersion(gomock.Any(), gomock.Any()).
	Return(infomodelClient.LatestVersion).
	AnyTimes()

metricsMock := NewMockMetrics(ctrl)
hybridCacheMock := NewMockHybridCache(ctrl)
hybridCacheMock.EXPECT().Get(gomock.Any()).Return(nil, false).Times(1)
hybridCacheMock.EXPECT().Put(gomock.Any(), gomock.Any()).Times(1)
healthMetrics := NewPublishHealthMetrics(metricsMock, hybridCacheMock)
metricsMock.
	EXPECT().
	TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
	AnyTimes()

catalogsMock := NewMockCatalogs(ctrl)

log, _ := logger.New(logger.WithEnabled(false))
dictsParams := New(
	log,
	draftHashVerifierMock,
	NewMockSessionIDGenerator(ctrl),
	draftStorageMock,
	userProfileMock,
	accountsHierarchyMock,
	nav,
	eventSenderMock,
	NewMockSellerAddressesClient(ctrl),
	NewMockAddressBookClient(ctrl),
	tariffAggregatorMock,
	compositionMock,
	NewMockFormManager(ctrl),
	NewMockPublishItemActions(ctrl),
	NewMockCoreGeo(ctrl),
	NewMockUserLimits(ctrl),
	NewMockVas(ctrl),
	NewMockParamsProcessor(ctrl),
	NewMockGorelkin(ctrl),
	NewMockGeoResolver(ctrl),
	NewMockItemPlatformClient(ctrl),
	NewMockItemPlatformExpander(ctrl),
	profileCoreInstanceMock,
	NewMockTogglesManager(ctrl),
	healthMetrics,
	NewMockRejectionInfoGetterInterface(ctrl),
	catalogsMock,
)
result, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

assert.Error(t, err)
assert.Equal(t, tariffAggregator.ErrDefault, err)
assert.Nil(t, result)
}

func TestDictsParameters_Process_SellerAddressesError_GD_Success(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(123)
userSegments := map[string]interface{}{
	"segmentationSlug": "segmentSlug",
}
data := Data{
	UserID: userID,
	UserData: components.DictsParametersRequestForm{
		Navigation: components.Navigation{
			CategoryId: operations.Pointer(int64(category.AnimalsAqua)),
			Group:      operations.Pointer("group"),
			Attributes: []components.NavigationAttributesItem{
				{
					Id:    int64(1),
					Value: int64(4),
				},
				{
					Id:    int64(2),
					Value: int64(5),
				},
			},
			Config: &components.NavigationConfig{
				Branch: operations.Pointer("branch"),
				Tree:   operations.Pointer("tree"),
				Layout: operations.Pointer(resolving.PlatformAndroidCreationLayout),
			},
		},
		Params: map[string]interface{}{
			"1":               12,
			"3":               6,
			"[{\"1\":12345}]": "[{\"1\":12345}]",
		},
		PublishSessionId: operations.Pointer("sessionId"),
	},
	Platform: resolving.PlatformMAV,
}

draftStorageMock := NewMockDraftStorage(ctrl)
draftStorageMock.EXPECT().GetShouldSaveDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(true)

draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
userProfileMock := NewMockUserProfile(ctrl)
userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
	Return(
		&userProfile.User{
			ID:        int64(123),
			IsCompany: operations.Pointer(true),
		}, nil)
accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
nav := NewMockNavigationManager(ctrl)
nav.EXPECT().FindExactNode(
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
).Return(&infomodel.NavigationsNode{
	Config: infomodel.NavigationsNodeConfig{
		Category: operations.Pointer[int64](category.RealEstateFlats),
	},
}, nil)
nav.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
	Return(&infomodel.NavigationsNode{}, nil)
nav.EXPECT().GetCategoryByID(gomock.Any(), gomock.Any(), gomock.Any()).Return(&infomodelModel.Category{Slug: "slug"}, nil).AnyTimes()
nav.EXPECT().GetVerticalCategory(gomock.Any(), gomock.Any(), gomock.Any()).Return(&infomodelModel.Category{Slug: "parentSlug"}, nil).AnyTimes()
nav.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
nav.EXPECT().GetChainOfNavNames(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil).AnyTimes()
nav.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)

eventSenderMock := NewMockEventSender(ctrl)
eventSenderMock.EXPECT().ItemDraftAddStart(gomock.Any(), gomock.Any()).AnyTimes()
eventSenderMock.EXPECT().ItemAddCategoryStructureLastClick(gomock.Any(), gomock.Any()).AnyTimes()

tariffAggregatorMock := NewMockTariffAggregator(ctrl)
tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).AnyTimes().Return(false, nil)
tariffAggregatorMock.EXPECT().GetTariffByUserID(gomock.Any(), gomock.Any()).AnyTimes().Return(nil, nil)

sellerAddressesMock := NewMockSellerAddressesClient(ctrl)
sellerAddressesMock.EXPECT().GetSellerAddressesCount(gomock.Any(), gomock.Any()).
	Return(int64(123), sellerAddresses.ErrSellerAddressesDefault)

compositionMock := NewMockComposition(ctrl)
frMock := NewMockFeatureRegistry(ctrl)
frMock.EXPECT().Check(gomock.Any()).Return(true).AnyTimes()
compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)
compositionMock.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
compositionMock.EXPECT().GetV5FormBuild(gomock.Any(), gomock.Any()).
	Return(
		&infomodelValidation.FormResponseV5{
			Steps: nil,
			Slots: nil,
			Form: []infomodelValidation.FormFieldV2Response{
				{
					Data: infomodelValidation.FormFieldResponseData{
						Id: avito.CatalogUid110839,
						Value: &infomodelValidation.FormFieldValue{
							String: operations.Pointer("99991234567"),
						},
					},
				},
			},
		},
		nil,
	)
compositionMock.EXPECT().AppendInfomodelCatalogValues(gomock.Any(), gomock.Any(), "", "99991234567", gomock.Any())
formManagerMock := NewMockFormManager(ctrl)
formManagerMock.EXPECT().ModifyFormBeforeBuild(gomock.Any(), gomock.Any()).Return(nil)
formManagerMock.EXPECT().ModifyFormAfterBuild(gomock.Any(), gomock.Any()).Return(nil)
compositionMock.EXPECT().
	GetInfomodelVersion(gomock.Any(), gomock.Any()).
	Return(infomodelClient.LatestVersion).
	AnyTimes()
geoMock := NewMockCoreGeo(ctrl)

actionsMock := NewMockPublishItemActions(ctrl)
actionsMock.EXPECT().
	GetSlots(
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
	).
	Return([]slot.Slot{}, nil)

userLimitsMock := NewMockUserLimits(ctrl)

vasMock := NewMockVas(ctrl)

paramsProcessorMock := NewMockParamsProcessor(ctrl)
paramsProcessorMock.EXPECT().GetParams(
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
).Return([]paramsProcessedModels.ProcessedParam{{ID: 123}}, nil)

gorelkinMock := NewMockGorelkin(ctrl)
gorelkinMock.EXPECT().ProcessSteps(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)

itemPlatformMock := NewMockItemPlatformClient(ctrl)
itemPlatformExpanderMock := NewMockItemPlatformExpander(ctrl)
itemPlatformExpanderMock.EXPECT().Expand(gomock.Any(), gomock.Any()).Return(nil)

profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)

metricsMock := NewMockMetrics(ctrl)
hybridCacheMock := NewMockHybridCache(ctrl)
hybridCacheMock.EXPECT().Get(gomock.Any()).Return(nil, false).Times(1)
hybridCacheMock.EXPECT().Put(gomock.Any(), gomock.Any()).Times(1)
healthMetrics := NewPublishHealthMetrics(metricsMock, hybridCacheMock)
metricsMock.
	EXPECT().
	TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
	AnyTimes()

catalogsMock := NewMockCatalogs(ctrl)

togglesManager := NewMockTogglesManager(ctrl)
togglesManager.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)
togglesManager.EXPECT().GetBool("sellerx_dicts_parameters_parse_params_v2").Return(true, nil)

log, _ := logger.New(logger.WithEnabled(false))
dictsParams := New(
	log,
	draftHashVerifierMock,
	NewMockSessionIDGenerator(ctrl),
	draftStorageMock,
	userProfileMock,
	accountsHierarchyMock,
	nav,
	eventSenderMock,
	sellerAddressesMock,
	NewMockAddressBookClient(ctrl),
	tariffAggregatorMock,
	compositionMock,
	formManagerMock,
	actionsMock,
	geoMock,
	userLimitsMock,
	vasMock,
	paramsProcessorMock,
	gorelkinMock,
	NewMockGeoResolver(ctrl),
	itemPlatformMock,
	itemPlatformExpanderMock,
	profileCoreInstanceMock,
	togglesManager,
	healthMetrics,
	NewMockRejectionInfoGetterInterface(ctrl),
	catalogsMock,
)
_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

assert.NoError(t, err)
}

// tagID 17705 Проверка, если сервис черновиков вернул ошибку, то возвращаем в хэндлер ошибку ErrDraftServiceUnavailable
func TestDictsParameters_Process_DraftGetError(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(43)
foreignUserID := int64(555)
draftID := int64(123)

testData := []struct {
	name   string
	err    error
	result error
	draft  *draftStorage.Draft
}{
	{
		name:   "draft not found",
		err:    draftStorage.ErrNotFound,
		result: friendlyError.ErrDraftNotFound(draftStorage.ErrNotFound),
		draft:  nil,
	},
	{
		name:   "draft error default",
		err:    draftStorage.ErrDefault,
		result: ErrDraftServiceUnavailable,
		draft:  nil,
	},
	{
		name:   "draft is foreign",
		err:    nil,
		result: friendlyError.ErrDraftIsForeign(ErrForeignDraft),
		draft: &draftStorage.Draft{
			UserID: &foreignUserID,
		},
	},
}

data := Data{
	UserID: userID,
	UserData: components.DictsParametersRequestForm{
		DraftId:   operations.Pointer[int64](draftID),
		DraftHash: operations.Pointer("a94a8fe5ccb1"),
	},
	Platform: resolving.PlatformMAV,
}

log, _ := logger.New(logger.WithEnabled(false))
for _, testCase := range testData {
	draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
	draftHashVerifierMock.EXPECT().Verify(gomock.Eq(draftID), gomock.Any()).Return(true)

	draftStorageMock := NewMockDraftStorage(ctrl)
	draftStorageMock.EXPECT().BindToUser(
		gomock.Any(),
		gomock.Eq(draftID),
		gomock.Eq(userID),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
	).Return(true, nil)
	draftStorageMock.EXPECT().Get(gomock.Any(), gomock.Any()).Return(testCase.draft, testCase.err)

	userProfileMock := NewMockUserProfile(ctrl)
	userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
		Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil)
	accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
	nav := NewMockNavigationManager(ctrl)
	eventSenderMock := NewMockEventSender(ctrl)
	tariffAggregatorMock := NewMockTariffAggregator(ctrl)
	tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).
		Return(false, nil)

	frMock := NewMockFeatureRegistry(ctrl)
	frMock.EXPECT().Check(gomock.Any()).Return(false).Times(1)
	compositionMock := NewMockComposition(ctrl)
	compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)

	profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
	profileCoreInstanceMock.EXPECT().GetProfessionalInfo(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)
	sessionIDGenerator := NewMockSessionIDGenerator(ctrl)
	sessionIDGenerator.EXPECT().Generate(userID, gomock.Any()).Return("")

	compositionMock.EXPECT().
		GetInfomodelVersion(gomock.Any(), gomock.Any()).
		Return(infomodelClient.LatestVersion).
		AnyTimes()

	metricsMock := NewMockMetrics(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))

	catalogsMock := NewMockCatalogs(ctrl)

	dictsParams := New(
		log,
		draftHashVerifierMock,
		sessionIDGenerator,
		draftStorageMock,
		userProfileMock,
		accountsHierarchyMock,
		nav,
		eventSenderMock,
		NewMockSellerAddressesClient(ctrl),
		NewMockAddressBookClient(ctrl),
		tariffAggregatorMock,
		compositionMock,
		NewMockFormManager(ctrl),
		NewMockPublishItemActions(ctrl),
		NewMockCoreGeo(ctrl),
		NewMockUserLimits(ctrl),
		NewMockVas(ctrl),
		NewMockParamsProcessor(ctrl),
		NewMockGorelkin(ctrl),
		NewMockGeoResolver(ctrl),
		NewMockItemPlatformClient(ctrl),
		NewMockItemPlatformExpander(ctrl),
		profileCoreInstanceMock,
		NewMockTogglesManager(ctrl),
		healthMetrics,
		NewMockRejectionInfoGetterInterface(ctrl),
		catalogsMock,
	)
	_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

	assert.Error(t, err, testCase.name)
	assert.Equal(t, testCase.result, err, testCase.name)
}
}

func TestDictsParameters_Process_DraftBindError(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

testData := []struct {
	name             string
	success          bool
	err              error
	result           error
	draftStorageMock func(d *MockDraftStorage)
}{
	{
		name:    "draft not found",
		success: false,
		err:     draftStorage.ErrNotFound,
		result:  friendlyError.ErrDraftNotFound(draftStorage.ErrNotFound),
		draftStorageMock: func(d *MockDraftStorage) {
			d.EXPECT().Get(gomock.Any(), gomock.Any()).Return(nil, draftStorage.ErrNotFound)
		},
	},
	{
		name:             "draft limit exceeded",
		success:          false,
		err:              draftStorage.ErrForbidden,
		result:           friendlyError.ErrDraftLimitExceeded(draftStorage.ErrForbidden),
		draftStorageMock: func(d *MockDraftStorage) {},
	},
	{
		name:             "draft error default",
		success:          false,
		err:              draftStorage.ErrDefault,
		result:           friendlyError.ErrDraftDefault(draftStorage.ErrDefault),
		draftStorageMock: func(d *MockDraftStorage) {},
	},
}

userID := int64(43)
draftID := int64(123)
data := Data{
	UserID: userID,
	UserData: components.DictsParametersRequestForm{
		DraftId:   operations.Pointer[int64](draftID),
		DraftHash: operations.Pointer("a94a8fe5ccb1"),
	},
	Platform: resolving.PlatformMAV,
}

log, _ := logger.New(logger.WithEnabled(false))
for _, testCase := range testData {
	draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
	draftHashVerifierMock.EXPECT().Verify(gomock.Eq(draftID), gomock.Any()).Return(true)

	draftStorageMock := NewMockDraftStorage(ctrl)
	draftStorageMock.EXPECT().BindToUser(
		gomock.Any(),
		gomock.Eq(draftID),
		gomock.Eq(userID),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
	).Return(testCase.success, testCase.err)

	testCase.draftStorageMock(draftStorageMock)

	userProfileMock := NewMockUserProfile(ctrl)
	userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
		Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil)
	accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
	nav := NewMockNavigationManager(ctrl)
	eventSenderMock := NewMockEventSender(ctrl)
	tariffAggregatorMock := NewMockTariffAggregator(ctrl)
	tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).
		Return(false, nil)
	frMock := NewMockFeatureRegistry(ctrl)
	frMock.EXPECT().Check(gomock.Any()).Return(false).Times(1)
	compositionMock := NewMockComposition(ctrl)
	compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)
	compositionMock.EXPECT().
		GetInfomodelVersion(gomock.Any(), gomock.Any()).
		Return(infomodelClient.LatestVersion).
		AnyTimes()

	profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
	profileCoreInstanceMock.EXPECT().GetProfessionalInfo(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)
	sessionIDGenerator := NewMockSessionIDGenerator(ctrl)
	sessionIDGenerator.EXPECT().Generate(userID, gomock.Any()).Return("")
	metricsMock := NewMockMetrics(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))

	catalogsMock := NewMockCatalogs(ctrl)

	dictsParams := New(
		log,
		draftHashVerifierMock,
		sessionIDGenerator,
		draftStorageMock,
		userProfileMock,
		accountsHierarchyMock,
		nav,
		eventSenderMock,
		NewMockSellerAddressesClient(ctrl),
		NewMockAddressBookClient(ctrl),
		tariffAggregatorMock,
		compositionMock,
		NewMockFormManager(ctrl),
		NewMockPublishItemActions(ctrl),
		NewMockCoreGeo(ctrl),
		NewMockUserLimits(ctrl),
		NewMockVas(ctrl),
		NewMockParamsProcessor(ctrl),
		NewMockGorelkin(ctrl),
		NewMockGeoResolver(ctrl),
		NewMockItemPlatformClient(ctrl),
		NewMockItemPlatformExpander(ctrl),
		profileCoreInstanceMock,
		NewMockTogglesManager(ctrl),
		healthMetrics,
		NewMockRejectionInfoGetterInterface(ctrl),
		catalogsMock,
	)
	_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

	if testCase.err != nil {
		assert.Error(t, err, testCase.name)
		assert.Equal(t, testCase.result, err, testCase.name)
	} else {
		assert.NoError(t, err, testCase.name)
		assert.True(t, testCase.success, testCase.name)
	}
}
}

func TestDictsParameters_Process_DraftSetAvailabilityError(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(43)
draftID := int64(123)

testData := []struct {
	name    string
	success bool
	err     error
	result  error
}{
	{
		name:    "draft not found",
		success: false,
		err:     draftStorage.ErrNotFound,
		result:  friendlyError.ErrDraftNotFound(draftStorage.ErrNotFound),
	},
	{
		name:    "draft is foreign",
		success: false,
		err:     draftStorage.ErrDefault,
		result:  friendlyError.ErrDraftDefault(draftStorage.ErrDefault),
	},
}

data := Data{
	UserID: userID,
	UserData: components.DictsParametersRequestForm{
		DraftId:   operations.Pointer[int64](draftID),
		DraftHash: operations.Pointer("a94a8fe5ccb1"),
	},
	Platform: resolving.PlatformMAV,
}

log, _ := logger.New(logger.WithEnabled(false))
for _, testCase := range testData {
	draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
	draftHashVerifierMock.EXPECT().Verify(gomock.Eq(draftID), gomock.Any()).Return(true)

	draftStorageMock := NewMockDraftStorage(ctrl)
	draftStorageMock.EXPECT().BindToUser(
		gomock.Any(),
		gomock.Eq(draftID),
		gomock.Eq(userID),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
	).Return(true, nil)
	draftStorageMock.EXPECT().Get(gomock.Any(), gomock.Any()).Return(
		&draftStorage.Draft{
			UserID:    &userID,
			Available: false,
		}, nil)
	draftStorageMock.EXPECT().SetAvailability(gomock.Any(), gomock.Any(), gomock.Any()).
		Return(testCase.success, testCase.err)

	userProfileMock := NewMockUserProfile(ctrl)
	userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
		Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil)
	accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
	nav := NewMockNavigationManager(ctrl)
	eventSenderMock := NewMockEventSender(ctrl)
	tariffAggregatorMock := NewMockTariffAggregator(ctrl)
	tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).
		Return(false, nil)
	frMock := NewMockFeatureRegistry(ctrl)
	frMock.EXPECT().Check(gomock.Any()).Return(false).Times(1)
	compositionMock := NewMockComposition(ctrl)
	compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)

	profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
	profileCoreInstanceMock.EXPECT().GetProfessionalInfo(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)
	sessionIDGenerator := NewMockSessionIDGenerator(ctrl)
	sessionIDGenerator.EXPECT().Generate(userID, gomock.Any()).Return("")
	metricsMock := NewMockMetrics(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))

	compositionMock.EXPECT().
		GetInfomodelVersion(gomock.Any(), gomock.Any()).
		Return(infomodelClient.LatestVersion).
		AnyTimes()

	catalogsMock := NewMockCatalogs(ctrl)

	dictsParams := New(
		log,
		draftHashVerifierMock,
		sessionIDGenerator,
		draftStorageMock,
		userProfileMock,
		accountsHierarchyMock,
		nav,
		eventSenderMock,
		NewMockSellerAddressesClient(ctrl),
		NewMockAddressBookClient(ctrl),
		tariffAggregatorMock,
		compositionMock,
		NewMockFormManager(ctrl),
		NewMockPublishItemActions(ctrl),
		NewMockCoreGeo(ctrl),
		NewMockUserLimits(ctrl),
		NewMockVas(ctrl),
		NewMockParamsProcessor(ctrl),
		NewMockGorelkin(ctrl),
		NewMockGeoResolver(ctrl),
		NewMockItemPlatformClient(ctrl),
		NewMockItemPlatformExpander(ctrl),
		profileCoreInstanceMock,
		NewMockTogglesManager(ctrl),
		healthMetrics,
		NewMockRejectionInfoGetterInterface(ctrl),
		catalogsMock,
	)
	_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

	assert.Error(t, err, testCase.name)
	assert.Equal(t, testCase.result, err, testCase.name)
}
}

func TestDictsParameters_GetDraft_EmptySlots(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(43)
draftID := int64(123)
draftHash := "a94a8fe5ccb1"

draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
draftHashVerifierMock.EXPECT().Verify(gomock.Eq(draftID), gomock.Any()).Return(true)

draftStorageMock := NewMockDraftStorage(ctrl)
draftStorageMock.EXPECT().BindToUser(
	gomock.Any(),
	gomock.Eq(draftID),
	gomock.Eq(userID),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
).Return(true, nil)
draftStorageMock.EXPECT().Get(gomock.Any(), gomock.Any()).Return(
	&draftStorage.Draft{
		UserID:    &userID,
		Available: false,
		Attributes: &[]draftStorage.Attribute{
			{
				ID:    int64(dictInterfaces.Description100002),
				Value: "<br />Test string<br />",
			},
		},
	}, nil)
draftStorageMock.EXPECT().SetAvailability(gomock.Any(), gomock.Any(), gomock.Any()).Return(true, nil)

userProfileMock := NewMockUserProfile(ctrl)
accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
nav := NewMockNavigationManager(ctrl)
eventSenderMock := NewMockEventSender(ctrl)
tariffAggregatorMock := NewMockTariffAggregator(ctrl)
compositionMock := NewMockComposition(ctrl)
sessionIDGenerator := NewMockSessionIDGenerator(ctrl)
sessionIDGenerator.EXPECT().Generate(userID, gomock.Any()).Return("").Times(2)

metricsMock := NewMockMetrics(ctrl)
healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))

catalogsMock := NewMockCatalogs(ctrl)

log, _ := logger.New(logger.WithEnabled(false))
dictsParams := New(
	log,
	draftHashVerifierMock,
	sessionIDGenerator,
	draftStorageMock,
	userProfileMock,
	accountsHierarchyMock,
	nav,
	eventSenderMock,
	NewMockSellerAddressesClient(ctrl),
	NewMockAddressBookClient(ctrl),
	tariffAggregatorMock,
	compositionMock,
	NewMockFormManager(ctrl),
	NewMockPublishItemActions(ctrl),
	NewMockCoreGeo(ctrl),
	NewMockUserLimits(ctrl),
	NewMockVas(ctrl),
	NewMockParamsProcessor(ctrl),
	NewMockGorelkin(ctrl),
	NewMockGeoResolver(ctrl),
	NewMockItemPlatformClient(ctrl),
	NewMockItemPlatformExpander(ctrl),
	NewMockProfileCoreInstance(ctrl),
	NewMockTogglesManager(ctrl),
	healthMetrics,
	NewMockRejectionInfoGetterInterface(ctrl),
	catalogsMock,
)
draft, err := dictsParams.getDraft(
	context.Background(),
	userID,
	draftID,
	&draftHash,
	resolving.PlatformAndroid,
	"",
	false,
)

assert.NoError(t, err)
assert.Equal(t, "\nTest string\n", (*draft.Attributes)[0].Value)
}

func TestDictsParameters_IsUserCompanyOrEmployee(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(43)
testErr := errors.New("test error")

testData := []struct {
	name                  string
	success               bool
	err                   error
	userProfileMock       func(u *MockUserProfile)
	accountsHierarchyMock func(a *MockAccountsHierarchy)
}{
	{
		name:    "user profile error",
		success: false,
		err:     testErr,
		userProfileMock: func(u *MockUserProfile) {
			u.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).Return(nil, testErr)
		},
		accountsHierarchyMock: func(a *MockAccountsHierarchy) {},
	},
	{
		name:    "user is not company",
		success: false,
		err:     nil,
		userProfileMock: func(u *MockUserProfile) {
			u.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).Return(&userProfile.User{}, nil)
		},
		accountsHierarchyMock: func(a *MockAccountsHierarchy) {},
	},
	{
		name:    "user is company",
		success: true,
		err:     nil,
		userProfileMock: func(u *MockUserProfile) {
			u.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).Return(
				&userProfile.User{
					IsCompany: operations.Pointer(true),
				}, nil)
		},
		accountsHierarchyMock: func(a *MockAccountsHierarchy) {},
	},
	{
		name:    "accounts hierarchy error",
		success: false,
		err:     testErr,
		userProfileMock: func(u *MockUserProfile) {
			u.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).Return(
				&userProfile.User{
					IsCompany: operations.Pointer(false),
				}, nil)
		},
		accountsHierarchyMock: func(a *MockAccountsHierarchy) {
			a.EXPECT().GetEmployeeByID(gomock.Any(), gomock.Any()).Return(nil, testErr)
		},
	},
	{
		name:    "accounts hierarchy not found",
		success: false,
		err:     nil,
		userProfileMock: func(u *MockUserProfile) {
			u.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).Return(
				&userProfile.User{
					IsCompany: operations.Pointer(false),
				}, nil)
		},
		accountsHierarchyMock: func(a *MockAccountsHierarchy) {
			a.EXPECT().GetEmployeeByID(gomock.Any(), gomock.Any()).
				Return(nil, accountsHierarchy.ErrHierarchyAccountNotFound)
		},
	},
	{
		name:    "accounts hierarchy for employee",
		success: true,
		err:     nil,
		userProfileMock: func(u *MockUserProfile) {
			u.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).Return(
				&userProfile.User{
					IsCompany: operations.Pointer(false),
				}, nil)
		},
		accountsHierarchyMock: func(a *MockAccountsHierarchy) {
			a.EXPECT().GetEmployeeByID(gomock.Any(), gomock.Any()).
				Return(&accountsHierarchy.Employee{}, nil)
		},
	},
}

draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
draftStorageMock := NewMockDraftStorage(ctrl)
userProfileMock := NewMockUserProfile(ctrl)
accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
nav := NewMockNavigationManager(ctrl)
eventSenderMock := NewMockEventSender(ctrl)
tariffAggregatorMock := NewMockTariffAggregator(ctrl)
compositionMock := NewMockComposition(ctrl)
metricsMock := NewMockMetrics(ctrl)
healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
catalogsMock := NewMockCatalogs(ctrl)
log, _ := logger.New(logger.WithEnabled(false))

for _, testCase := range testData {
	t.Run(testCase.name, func(t *testing.T) {
		testCase.userProfileMock(userProfileMock)
		testCase.accountsHierarchyMock(accountsHierarchyMock)

		dictsParams := New(
			log,
			draftHashVerifierMock,
			NewMockSessionIDGenerator(ctrl),
			draftStorageMock,
			userProfileMock,
			accountsHierarchyMock,
			nav,
			eventSenderMock,
			NewMockSellerAddressesClient(ctrl),
			NewMockAddressBookClient(ctrl),
			tariffAggregatorMock,
			compositionMock,
			NewMockFormManager(ctrl),
			NewMockPublishItemActions(ctrl),
			NewMockCoreGeo(ctrl),
			NewMockUserLimits(ctrl),
			NewMockVas(ctrl),
			NewMockParamsProcessor(ctrl),
			NewMockGorelkin(ctrl),
			NewMockGeoResolver(ctrl),
			NewMockItemPlatformClient(ctrl),
			NewMockItemPlatformExpander(ctrl),
			NewMockProfileCoreInstance(ctrl),
			NewMockTogglesManager(ctrl),
			healthMetrics,
			NewMockRejectionInfoGetterInterface(ctrl),
			catalogsMock,
		)
		isCompany, err := dictsParams.isUserCompanyOrEmployee(context.Background(), userID)

		assert.Equal(t, testCase.success, isCompany, testCase.name)
		assert.Equal(t, testCase.err, err)
	})
}
}

func TestDictsParameters_GetDraft_UserProfileError(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(43)
draftID := int64(123)
draftHash := "a94a8fe5ccb1"

draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
draftHashVerifierMock.EXPECT().Verify(gomock.Eq(draftID), gomock.Any()).Return(true)

draftStorageMock := NewMockDraftStorage(ctrl)
draftStorageMock.EXPECT().BindToUser(
	gomock.Any(),
	gomock.Eq(draftID),
	gomock.Eq(userID),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
).Return(true, nil)
draftStorageMock.EXPECT().Get(gomock.Any(), gomock.Any()).Return(
	&draftStorage.Draft{
		UserID:    &userID,
		Available: false,
		Attributes: &[]draftStorage.Attribute{
			{
				ID:    int64(dictInterfaces.Description100002),
				Value: "<br />Test string<br />",
			},
		},
		Slots: &[]draftStorage.Slot{
			{
				ID: 123,
			},
		},
	}, nil)
draftStorageMock.EXPECT().SetAvailability(gomock.Any(), gomock.Any(), gomock.Any()).Return(true, nil)

errTest := errors.New("test error")

userProfileMock := NewMockUserProfile(ctrl)
accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).Return(nil, errTest)
nav := NewMockNavigationManager(ctrl)
eventSenderMock := NewMockEventSender(ctrl)
tariffAggregatorMock := NewMockTariffAggregator(ctrl)
compositionMock := NewMockComposition(ctrl)
sessionIDGenerator := NewMockSessionIDGenerator(ctrl)
sessionIDGenerator.EXPECT().Generate(userID, gomock.Any()).Return("").Times(2)
metricsMock := NewMockMetrics(ctrl)
healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
catalogsMock := NewMockCatalogs(ctrl)

log, _ := logger.New(logger.WithEnabled(false))
dictsParams := New(
	log,
	draftHashVerifierMock,
	sessionIDGenerator,
	draftStorageMock,
	userProfileMock,
	accountsHierarchyMock,
	nav,
	eventSenderMock,
	NewMockSellerAddressesClient(ctrl),
	NewMockAddressBookClient(ctrl),
	tariffAggregatorMock,
	compositionMock,
	NewMockFormManager(ctrl),
	NewMockPublishItemActions(ctrl),
	NewMockCoreGeo(ctrl),
	NewMockUserLimits(ctrl),
	NewMockVas(ctrl),
	NewMockParamsProcessor(ctrl),
	NewMockGorelkin(ctrl),
	NewMockGeoResolver(ctrl),
	NewMockItemPlatformClient(ctrl),
	NewMockItemPlatformExpander(ctrl),
	NewMockProfileCoreInstance(ctrl),
	NewMockTogglesManager(ctrl),
	healthMetrics,
	NewMockRejectionInfoGetterInterface(ctrl),
	catalogsMock,
)

ctx := context.Background()
draft, err := dictsParams.getDraft(
	ctx,
	userID,
	draftID,
	&draftHash,
	resolving.PlatformAndroid,
	"",
	false,
)

assert.Nil(t, draft)
assert.Error(t, err)
assert.Equal(t, ErrDraftServiceUnavailable, err)
}

func TestDictsParameters_GetDraft_Success(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(43)
draftID := int64(123)
draftHash := "a94a8fe5ccb1"

draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
draftHashVerifierMock.EXPECT().Verify(gomock.Eq(draftID), gomock.Any()).Return(true)

draftStorageMock := NewMockDraftStorage(ctrl)
draftStorageMock.EXPECT().BindToUser(
	gomock.Any(),
	gomock.Eq(draftID),
	gomock.Eq(userID),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
).Return(true, nil)
draftStorageMock.EXPECT().Get(gomock.Any(), gomock.Any()).Return(
	&draftStorage.Draft{
		UserID:    &userID,
		Available: false,
		Attributes: &[]draftStorage.Attribute{
			{
				ID:    int64(dictInterfaces.Description100002),
				Value: "<br />Test string<br />",
			},
		},
		Slots: &[]draftStorage.Slot{
			{
				ID:   123,
				Type: contactInfoSlot.SlotContactInfoName,
				Value: map[string]interface{}{
					dictParams.ManagerField: "test manager name",
					"some field":            123,
				},
			},
		},
	}, nil)
draftStorageMock.EXPECT().SetAvailability(gomock.Any(), gomock.Any(), gomock.Any()).Return(true, nil)

userProfileMock := NewMockUserProfile(ctrl)
accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
accountsHierarchyMock.EXPECT().GetEmployeeByID(gomock.Any(), userID).Return(nil, accountsHierarchy.ErrHierarchyAccountNotFound)
userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
	Return(&userProfile.User{IsCompany: operations.Pointer(false)}, nil)
nav := NewMockNavigationManager(ctrl)
eventSenderMock := NewMockEventSender(ctrl)
tariffAggregatorMock := NewMockTariffAggregator(ctrl)
compositionMock := NewMockComposition(ctrl)
sessionIDGenerator := NewMockSessionIDGenerator(ctrl)
sessionIDGenerator.EXPECT().Generate(userID, gomock.Any()).Return("").Times(2)
metricsMock := NewMockMetrics(ctrl)
healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
catalogsMock := NewMockCatalogs(ctrl)

log, _ := logger.New(logger.WithEnabled(false))
dictsParams := New(
	log,
	draftHashVerifierMock,
	sessionIDGenerator,
	draftStorageMock,
	userProfileMock,
	accountsHierarchyMock,
	nav,
	eventSenderMock,
	NewMockSellerAddressesClient(ctrl),
	NewMockAddressBookClient(ctrl),
	tariffAggregatorMock,
	compositionMock,
	NewMockFormManager(ctrl),
	NewMockPublishItemActions(ctrl),
	NewMockCoreGeo(ctrl),
	NewMockUserLimits(ctrl),
	NewMockVas(ctrl),
	NewMockParamsProcessor(ctrl),
	NewMockGorelkin(ctrl),
	NewMockGeoResolver(ctrl),
	NewMockItemPlatformClient(ctrl),
	NewMockItemPlatformExpander(ctrl),
	NewMockProfileCoreInstance(ctrl),
	NewMockTogglesManager(ctrl),
	healthMetrics,
	NewMockRejectionInfoGetterInterface(ctrl),
	catalogsMock,
)
draft, err := dictsParams.getDraft(
	context.Background(),
	userID,
	draftID,
	&draftHash,
	resolving.PlatformAndroid,
	"",
	false,
)

assert.NotNil(t, draft)
assert.NoError(t, err)
assert.Equal(t, map[string]interface{}{"some field": 123}, (*draft.Slots)[0].Value)
}

func TestDictsParameters_ResponseByDraftData(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(43)
userSegments := map[string]interface{}{
	"segmentationSlug": "segmentSlug",
}
draftID := int64(123)

testcases := []struct {
	name                   string
	data                   Data
	specs                  dictsParameters.Specifications
	hashVerifierMock       func(m *MockDraftHashVerifier)
	sessionIDGeneratorMock func(m *MockSessionIDGenerator)
	draftMock              func(m *MockDraftStorage)
	userProfileMock        func(m *MockUserProfile)
	AHMock                 func(m *MockAccountsHierarchy)
	NavManagerMock         func(m *MockNavigationManager, data Data)
	composition            func(m *MockComposition)
	formManagerMock        func(m *MockFormManager)
	actionsMock            func(m *MockPublishItemActions)
	togglesMock            func(m *MockTogglesManager)

	assetrs func(t *testing.T, res *dictsParameters.DictParamsResult, err error)
}{
	{
		name: "get navigation from draft without group",
		data: Data{
			UserID:   userID,
			DeviceID: "",
			Platform: resolving.PlatformMAV,
			UserData: components.DictsParametersRequestForm{
				ItemId:  nil,
				DraftId: &draftID,
				Navigation: components.Navigation{
					CategoryId: operations.Pointer[int64](int64(category.JobResume)),
					Group:      nil,
					Attributes: make([]components.NavigationAttributesItem, 0),
					Config: &components.NavigationConfig{
						Branch: operations.Pointer("SEL-001"),
						Tree:   operations.Pointer("mav"),
						Layout: operations.Pointer("mav_add"),
					},
				},
			},
		},
		specs:            dictsParameters.Specifications{},
		hashVerifierMock: func(m *MockDraftHashVerifier) {},
		sessionIDGeneratorMock: func(m *MockSessionIDGenerator) {
			m.EXPECT().Generate(userID, gomock.Any()).Return("")
		},
		draftMock: func(m *MockDraftStorage) {
			m.EXPECT().Get(gomock.Any(), gomock.Any()).Return(
				&draftStorage.Draft{
					UserID:     &userID,
					CategoryID: operations.Pointer[int64](category.JobResume),
					Available:  false,
					Attributes: &[]draftStorage.Attribute{
						{
							ID:    int64(dictInterfaces.Description100002),
							Value: "<br />Test string<br />",
						},
					},
					Slots: &[]draftStorage.Slot{
						{
							ID:   123,
							Type: contactInfoSlot.SlotContactInfoName,
							Value: map[string]interface{}{
								dictParams.ManagerField: "test manager name",
								"some field":            123,
							},
						},
					},
				}, nil)
			m.EXPECT().SetAvailability(gomock.Any(), gomock.Any(), gomock.Any()).Return(true, nil)
			m.EXPECT().GetShouldSaveDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(false)
		},
		actionsMock: func(m *MockPublishItemActions) {
			m.EXPECT().
				GetSlots(
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
				).
				Return([]slot.Slot{}, nil)
		},
		togglesMock: func(m *MockTogglesManager) {
			m.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)
			m.EXPECT().GetBool("sellerx_dicts_parameters_parse_params_v2").Return(true, nil)
		},
		userProfileMock: func(m *MockUserProfile) {
			m.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
				Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil).AnyTimes()
		},
		AHMock: func(m *MockAccountsHierarchy) {},
		NavManagerMock: func(m *MockNavigationManager, data Data) {
			m.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil).
				SetArg(2, components.Navigation{
					CategoryId:  operations.Pointer[int64](category.JobResume),
					CategoryIds: []int64{category.JobResume},
					Config: &components.NavigationConfig{
						Tree:   operations.Pointer("mav"),
						Layout: operations.Pointer("mav_add"),
						Branch: operations.Pointer(infomodelClient.LatestVersion),
					},
					Attributes: []components.NavigationAttributesItem{
						{
							Id:    232323,
							Value: 4545454,
						},
						{
							Id:    787878,
							Value: 90909090,
						},
					},
					Title:       operations.Pointer("Работа & Резюме"),
					Description: operations.Pointer("Резюме"),
				})
			m.EXPECT().FindExactNode(
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
			).Return(&infomodel.NavigationsNode{}, nil)
			m.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(&infomodel.NavigationsNode{}, nil)
			m.EXPECT().GetChainOfNavNames(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(nil, nil).AnyTimes()
			m.EXPECT().GetCategoryByID(gomock.Any(), gomock.Any(), gomock.Any()).
				Return(nil, nil).AnyTimes()
			m.EXPECT().FindNodeByAttributes(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(nil, fmt.Errorf("not found")).AnyTimes()

			m.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)
		},
		assetrs: func(t *testing.T, res *dictsParameters.DictParamsResult, err error) {
			assert.NoError(t, err)
			assert.Equal(t, components.Navigation{
				CategoryId:  operations.Pointer[int64](category.JobResume),
				CategoryIds: []int64{category.JobResume},
				Group:       nil,
				Config: &components.NavigationConfig{
					Tree:   operations.Pointer("mav"),
					Layout: operations.Pointer("mav_add"),
					Branch: operations.Pointer(infomodelClient.LatestVersion),
				},
				Attributes: []components.NavigationAttributesItem{
					{
						Id:    232323,
						Value: 4545454,
					},
					{
						Id:    787878,
						Value: 90909090,
					},
				},
				Title:       operations.Pointer("Работа & Резюме"),
				Description: operations.Pointer("Резюме"),
			}, res.Navigation, "не верно заполняется объект навигации")
		},
		composition: func(m *MockComposition) {
			m.EXPECT().AppendInfomodelCatalogValues(gomock.Any(), gomock.Any(), "", "", gomock.Any())
			m.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
		},
		formManagerMock: func(m *MockFormManager) {
			m.EXPECT().ModifyFormBeforeBuild(gomock.Any(), gomock.Any()).Return(nil)
			m.EXPECT().ModifyFormAfterBuild(gomock.Any(), gomock.Any()).Return(nil)
		},
	},
	{
		name: "get draft without attributes",
		data: Data{
			UserID:   userID,
			DeviceID: "",
			Platform: resolving.PlatformMAV,
			UserData: components.DictsParametersRequestForm{
				ItemId:  nil,
				DraftId: &draftID,
				Navigation: components.Navigation{
					CategoryId: operations.Pointer[int64](int64(category.JobResume)),
					Group:      nil,
					Attributes: make([]components.NavigationAttributesItem, 0),
					Config: &components.NavigationConfig{
						Branch: operations.Pointer("SEL-001"),
						Tree:   operations.Pointer("mav"),
						Layout: operations.Pointer("mav_add"),
					},
				},
			},
		},
		specs: dictsParameters.Specifications{
			IsResponseDraftAttributesSkipped: true,
		},
		hashVerifierMock: func(m *MockDraftHashVerifier) {},
		sessionIDGeneratorMock: func(m *MockSessionIDGenerator) {
			m.EXPECT().Generate(userID, gomock.Any()).Return("")
		},
		draftMock: func(m *MockDraftStorage) {
			m.EXPECT().Get(gomock.Any(), gomock.Any()).Return(
				&draftStorage.Draft{
					UserID:     &userID,
					CategoryID: operations.Pointer[int64](category.JobResume),
					Available:  true,
					Attributes: &[]draftStorage.Attribute{
						{
							ID:    int64(dictInterfaces.Description100002),
							Value: "<br />Test string<br />",
						},
					},
					Slots: &[]draftStorage.Slot{
						{
							ID:   123,
							Type: contactInfoSlot.SlotContactInfoName,
							Value: map[string]interface{}{
								dictParams.ManagerField: "test manager name",
								"some field":            123,
							},
						},
					},
				}, nil)
			m.EXPECT().GetShouldSaveDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(false)
		},
		actionsMock: func(m *MockPublishItemActions) {
			m.EXPECT().
				GetSlots(
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
				).
				Return([]slot.Slot{}, nil)
		},
		togglesMock: func(m *MockTogglesManager) {
			m.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)
			m.EXPECT().GetBool("sellerx_dicts_parameters_parse_params_v2").Return(true, nil)
		},
		userProfileMock: func(m *MockUserProfile) {
			m.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
				Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil).AnyTimes()
		},
		AHMock: func(m *MockAccountsHierarchy) {},
		NavManagerMock: func(m *MockNavigationManager, data Data) {
			m.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil).
				SetArg(2, components.Navigation{
					CategoryId:  operations.Pointer[int64](category.JobResume),
					CategoryIds: []int64{category.JobResume},
					Config: &components.NavigationConfig{
						Tree:   operations.Pointer("mav"),
						Layout: operations.Pointer("mav_add"),
						Branch: operations.Pointer(infomodelClient.LatestVersion),
					},
					Attributes: []components.NavigationAttributesItem{
						{
							Id:    232323,
							Value: 4545454,
						},
						{
							Id:    787878,
							Value: 90909090,
						},
					},
					Title:       operations.Pointer("Работа & Резюме"),
					Description: operations.Pointer("Резюме"),
				})
			m.EXPECT().FindExactNode(
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
			).Return(&infomodel.NavigationsNode{}, nil)
			m.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(&infomodel.NavigationsNode{}, nil)
			m.EXPECT().GetChainOfNavNames(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(nil, nil).AnyTimes()
			m.EXPECT().GetCategoryByID(gomock.Any(), gomock.Any(), gomock.Any()).
				Return(nil, nil).AnyTimes()
			m.EXPECT().FindNodeByAttributes(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(nil, fmt.Errorf("not found")).AnyTimes()
			m.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)
		},
		assetrs: func(t *testing.T, res *dictsParameters.DictParamsResult, err error) {
			assert.NoError(t, err)
			assert.Nil(t, res.Draft.Attributes)
		},
		composition: func(m *MockComposition) {
			m.EXPECT().AppendInfomodelCatalogValues(gomock.Any(), gomock.Any(), "", "", gomock.Any())
			m.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
		},
		formManagerMock: func(m *MockFormManager) {
			m.EXPECT().ModifyFormBeforeBuild(gomock.Any(), gomock.Any()).Return(nil)
			m.EXPECT().ModifyFormAfterBuild(gomock.Any(), gomock.Any()).Return(nil)
		},
	},
	{
		name: "get draft with attributes",
		data: Data{
			UserID:   userID,
			DeviceID: "",
			Platform: resolving.PlatformMAV,
			UserData: components.DictsParametersRequestForm{
				ItemId:  nil,
				DraftId: &draftID,
				Navigation: components.Navigation{
					CategoryId: operations.Pointer[int64](int64(category.JobResume)),
					Group:      nil,
					Attributes: make([]components.NavigationAttributesItem, 0),
					Config: &components.NavigationConfig{
						Branch: operations.Pointer("SEL-001"),
						Tree:   operations.Pointer("mav"),
						Layout: operations.Pointer("mav_add"),
					},
				},
			},
		},
		specs: dictsParameters.Specifications{
			IsResponseDraftAttributesSkipped: false,
		},
		hashVerifierMock: func(m *MockDraftHashVerifier) {},
		sessionIDGeneratorMock: func(m *MockSessionIDGenerator) {
			m.EXPECT().Generate(userID, gomock.Any()).Return("")
		},
		draftMock: func(m *MockDraftStorage) {
			m.EXPECT().Get(gomock.Any(), gomock.Any()).Return(
				&draftStorage.Draft{
					UserID:     &userID,
					CategoryID: operations.Pointer[int64](category.JobResume),
					Available:  true,
					Attributes: &[]draftStorage.Attribute{
						{
							ID:    int64(dictInterfaces.Description100002),
							Value: "<br />Test string<br />",
						},
					},
					Slots: &[]draftStorage.Slot{
						{
							ID:   123,
							Type: contactInfoSlot.SlotContactInfoName,
							Value: map[string]interface{}{
								dictParams.ManagerField: "test manager name",
								"some field":            123,
							},
						},
					},
				}, nil)
			m.EXPECT().GetShouldSaveDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(false)
		},
		actionsMock: func(m *MockPublishItemActions) {
			m.EXPECT().
				GetSlots(
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
				).
				Return([]slot.Slot{}, nil)
		},
		togglesMock: func(m *MockTogglesManager) {
			m.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)
			m.EXPECT().GetBool("sellerx_dicts_parameters_parse_params_v2").Return(true, nil)
		},
		userProfileMock: func(m *MockUserProfile) {
			m.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
				Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil).AnyTimes()
		},
		AHMock: func(m *MockAccountsHierarchy) {},
		NavManagerMock: func(m *MockNavigationManager, data Data) {
			m.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil).
				SetArg(2, components.Navigation{
					CategoryId:  operations.Pointer[int64](category.JobResume),
					CategoryIds: []int64{category.JobResume},
					Config: &components.NavigationConfig{
						Tree:   operations.Pointer("mav"),
						Layout: operations.Pointer("mav_add"),
						Branch: operations.Pointer(infomodelClient.LatestVersion),
					},
					Attributes: []components.NavigationAttributesItem{
						{
							Id:    232323,
							Value: 4545454,
						},
						{
							Id:    787878,
							Value: 90909090,
						},
					},
					Title:       operations.Pointer("Работа & Резюме"),
					Description: operations.Pointer("Резюме"),
				})
			m.EXPECT().FindExactNode(
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
			).Return(&infomodel.NavigationsNode{}, nil)
			m.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(&infomodel.NavigationsNode{}, nil)
			m.EXPECT().GetChainOfNavNames(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(nil, nil).AnyTimes()
			m.EXPECT().GetCategoryByID(gomock.Any(), gomock.Any(), gomock.Any()).
				Return(nil, nil).AnyTimes()
			m.EXPECT().FindNodeByAttributes(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(nil, fmt.Errorf("not found")).AnyTimes()
			m.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)
		},
		assetrs: func(t *testing.T, res *dictsParameters.DictParamsResult, err error) {
			assert.NoError(t, err)
			assert.NotNil(t, res.Draft.Attributes)
		},
		composition: func(m *MockComposition) {
			m.EXPECT().AppendInfomodelCatalogValues(gomock.Any(), gomock.Any(), "", "", gomock.Any())
			m.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
		},
		formManagerMock: func(m *MockFormManager) {
			m.EXPECT().ModifyFormBeforeBuild(gomock.Any(), gomock.Any()).Return(nil)
			m.EXPECT().ModifyFormAfterBuild(gomock.Any(), gomock.Any()).Return(nil)
		},
	},
}
log, _ := logger.New(logger.WithEnabled(false))
for _, tc := range testcases {
	t.Run(tc.name, func(t *testing.T) {
		draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
		tc.hashVerifierMock(draftHashVerifierMock)

		draftStorageMock := NewMockDraftStorage(ctrl)
		tc.draftMock(draftStorageMock)

		userProfileMock := NewMockUserProfile(ctrl)
		tc.userProfileMock(userProfileMock)

		accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
		tc.AHMock(accountsHierarchyMock)

		nav := NewMockNavigationManager(ctrl)
		tc.NavManagerMock(nav, tc.data)

		togglesMock := NewMockTogglesManager(ctrl)
		tc.togglesMock(togglesMock)

		eventSenderMock := NewMockEventSender(ctrl)
		tariffAggregatorMock := NewMockTariffAggregator(ctrl)
		tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).
			Return(false, nil)

		frMock := NewMockFeatureRegistry(ctrl)
		frMock.EXPECT().Check(gomock.Any()).Return(false).AnyTimes()
		compositionMock := NewMockComposition(ctrl)
		compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)
		compositionMock.EXPECT().
			GetInfomodelVersion(gomock.Any(), gomock.Any()).
			Return(infomodelClient.LatestVersion).
			AnyTimes()
		compositionMock.EXPECT().GetV5FormBuild(gomock.Any(), gomock.Any()).
			Return(
				&infomodelValidation.FormResponseV5{},
				nil,
			)
		tc.composition(compositionMock)

		formManagerMock := NewMockFormManager(ctrl)
		tc.formManagerMock(formManagerMock)

		actionsMock := NewMockPublishItemActions(ctrl)
		tc.actionsMock(actionsMock)

		paramsProcessorMock := NewMockParamsProcessor(ctrl)
		paramsProcessorMock.EXPECT().GetParams(
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
		).Return([]paramsProcessedModels.ProcessedParam{{ID: 123}}, nil).AnyTimes()

		gorelkinMock := NewMockGorelkin(ctrl)
		gorelkinMock.EXPECT().ProcessSteps(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)

		profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
		profileCoreInstanceMock.EXPECT().GetProfessionalInfo(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)

		itemPlatformExpanderMock := NewMockItemPlatformExpander(ctrl)
		itemPlatformExpanderMock.EXPECT().Expand(gomock.Any(), gomock.Any()).Return(nil)
		sessionIDGeneratorMock := NewMockSessionIDGenerator(ctrl)
		if tc.sessionIDGeneratorMock != nil {
			tc.sessionIDGeneratorMock(sessionIDGeneratorMock)
		}

		metricsMock := NewMockMetrics(ctrl)
		healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
		metricsMock.
			EXPECT().
			TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
			AnyTimes()

		catalogsMock := NewMockCatalogs(ctrl)
		catalogsMock.EXPECT().GetCatalogUIDByParams(gomock.Any(), &infomodelValidation.FormResponseV5{}).
			Return("", "", nil)

		dictsParams := New(
			log,
			draftHashVerifierMock,
			sessionIDGeneratorMock,
			draftStorageMock,
			userProfileMock,
			accountsHierarchyMock,
			nav,
			eventSenderMock,
			NewMockSellerAddressesClient(ctrl),
			NewMockAddressBookClient(ctrl),
			tariffAggregatorMock,
			compositionMock,
			formManagerMock,
			actionsMock,
			NewMockCoreGeo(ctrl),
			NewMockUserLimits(ctrl),
			NewMockVas(ctrl),
			paramsProcessorMock,
			gorelkinMock,
			NewMockGeoResolver(ctrl),
			NewMockItemPlatformClient(ctrl),
			itemPlatformExpanderMock,
			profileCoreInstanceMock,
			togglesMock,
			healthMetrics,
			NewMockRejectionInfoGetterInterface(ctrl),
			catalogsMock,
		)
		res, err := dictsParams.Process(
			context.Background(),
			tc.data,
			tc.specs,
		)
		tc.assetrs(t, res, err)
	})
}
}

func TestDictsParameters_GetOldItem(t *testing.T) {
userID := int64(43)
userSegments := map[string]interface{}{
	"segmentationSlug": "segmentSlug",
}

testcases := []struct {
	name                     string
	data                     Data
	specs                    dictsParameters.Specifications
	NavManagerMock           func(m *MockNavigationManager, data Data)
	composition              func(m *MockComposition)
	tariffAggregatorMock     func(m *MockTariffAggregator)
	itemPlatformMock         func(m *MockItemPlatformClient)
	itemPlatformExpanderMock func(m *MockItemPlatformExpander)
	formManagerMock          func(m *MockFormManager)
	rejectionInfoGetterMock  func(m *MockRejectionInfoGetterInterface)
	actionsMock              func(m *MockPublishItemActions)
	userLimitsMock           func(m *MockUserLimits)
	vasMock                  func(m *MockVas)
	eventSenderMock          func(m *MockEventSender)
	gorelkinMock             func(m *MockGorelkin)
	catalogsMock             func(m *MockCatalogs)
	togglesManagerMock       func(m *MockTogglesManager)

	asserts func(t *testing.T, res *dictsParameters.DictParamsResult, err error)
}{
	{
		name: "get oldItem success",
		data: Data{
			UserID:   userID,
			DeviceID: "",
			Platform: resolving.PlatformMAV,
			UserData: components.DictsParametersRequestForm{
				ItemId: operations.Pointer[int64](1234),
				Navigation: components.Navigation{
					CategoryId: operations.Pointer[int64](int64(category.JobResume)),
					Group:      nil,
					Attributes: make([]components.NavigationAttributesItem, 0),
					Config: &components.NavigationConfig{
						Branch: operations.Pointer("SEL-001"),
						Tree:   operations.Pointer("mav"),
						Layout: operations.Pointer("mav_add"),
					},
				},
			},
		},
		itemPlatformMock: func(m *MockItemPlatformClient) {
			id := int64(1234)
			m.EXPECT().GetByID(gomock.Any(), gomock.Eq(id), gomock.Eq(itemPlatform.ParamCollectionPublish)).
				Return(
					&itemPlatform.Item{
						ID:         id,
						CategoryID: operations.Pointer[int64](category.JobResume),
						StatusID:   operations.Pointer[int64](itemPlatformBrief.STATUSES_ACTIVATED),
					}, nil)
		},
		itemPlatformExpanderMock: func(m *MockItemPlatformExpander) {
		},
		NavManagerMock: func(m *MockNavigationManager, data Data) {
			m.EXPECT().FindExactNode(
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
			).Return(&infomodel.NavigationsNode{}, nil)
			m.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(&infomodel.NavigationsNode{}, nil)
			m.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
			m.EXPECT().GetCategoryByID(gomock.Any(), gomock.Any(), gomock.Any()).Return(&infomodelModel.Category{}, nil).AnyTimes()
			m.EXPECT().GetVerticalCategory(gomock.Any(), gomock.Any(), gomock.Any()).Return(&infomodelModel.Category{}, nil).AnyTimes()
			m.EXPECT().GetChainOfNavNames(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(nil, nil)

			m.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)
		},
		tariffAggregatorMock: func(m *MockTariffAggregator) {
			m.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).Return(false, nil)
		},
		composition: func(m *MockComposition) {
			m.EXPECT().
				GetInfomodelVersion(gomock.Any(), gomock.Any()).
				Return(infomodelClient.LatestVersion).
				AnyTimes()
			m.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
			m.EXPECT().GetV5FormBuild(gomock.Any(), gomock.Any()).
				Return(
					&infomodelValidation.FormResponseV5{},
					nil,
				)
			m.EXPECT().AppendInfomodelCatalogValues(gomock.Any(), gomock.Any(), "", "", gomock.Any())
		},
		formManagerMock: func(m *MockFormManager) {
			m.EXPECT().ModifyFormBeforeBuild(gomock.Any(), gomock.Any()).Return(nil)
			m.EXPECT().ModifyFormAfterBuild(gomock.Any(), gomock.Any()).Return(nil)
		},
		rejectionInfoGetterMock: func(m *MockRejectionInfoGetterInterface) {},
		actionsMock: func(m *MockPublishItemActions) {
			m.EXPECT().
				GetSlots(
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
				).
				Return([]slot.Slot{}, nil)
		},
		userLimitsMock: func(m *MockUserLimits) {
			m.EXPECT().GetFeeLastPublication(gomock.Any(), gomock.Any()).
				Return(&userLimits.FeeInfo{IsPaid: false}, nil)
		},
		vasMock: func(m *MockVas) {
			m.EXPECT().GetActiveVas(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)
		},
		eventSenderMock: func(m *MockEventSender) {
			m.EXPECT().ItemDraftAddStart(gomock.Any(), gomock.Any()).AnyTimes()
			m.EXPECT().ItemAddCategoryStructureLastClick(gomock.Any(), gomock.Any()).AnyTimes()
		},
		gorelkinMock: func(m *MockGorelkin) {
			m.EXPECT().ProcessSteps(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
		},
		togglesManagerMock: func(m *MockTogglesManager) {
			m.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)
			m.EXPECT().GetBool("sellerx_dicts_parameters_parse_params_v2").Return(true, nil)
		},
		asserts: func(t *testing.T, res *dictsParameters.DictParamsResult, err error) {
			assert.NoError(t, err)
		},

		catalogsMock: func(c *MockCatalogs) {
			c.EXPECT().GetCatalogUIDByParams(gomock.Any(), &infomodelValidation.FormResponseV5{}).
				Return("", "", nil)
		},
	},
	{
		name: "get oldItem service error",
		data: Data{
			UserID:   userID,
			DeviceID: "",
			Platform: resolving.PlatformMAV,
			UserData: components.DictsParametersRequestForm{
				ItemId: operations.Pointer[int64](1234),
				Navigation: components.Navigation{
					CategoryId: operations.Pointer[int64](int64(category.JobResume)),
					Group:      nil,
					Attributes: make([]components.NavigationAttributesItem, 0),
					Config: &components.NavigationConfig{
						Branch: operations.Pointer("SEL-001"),
						Tree:   operations.Pointer("mav"),
						Layout: operations.Pointer("mav_add"),
					},
				},
			},
		},
		NavManagerMock: func(m *MockNavigationManager, data Data) {},
		composition:    func(m *MockComposition) {},
		itemPlatformMock: func(m *MockItemPlatformClient) {
			id := int64(1234)
			m.EXPECT().GetByID(gomock.Any(), gomock.Eq(id), gomock.Eq(itemPlatform.ParamCollectionPublish)).Return(nil, fmt.Errorf("an error occured"))
		},
		itemPlatformExpanderMock: func(m *MockItemPlatformExpander) {
		},
		tariffAggregatorMock: func(m *MockTariffAggregator) {
			m.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).Return(false, nil)
		},
		rejectionInfoGetterMock: func(m *MockRejectionInfoGetterInterface) {},
		formManagerMock:         func(m *MockFormManager) {},
		actionsMock:             func(m *MockPublishItemActions) {},
		userLimitsMock:          func(m *MockUserLimits) {},
		vasMock:                 func(m *MockVas) {},
		eventSenderMock:         func(m *MockEventSender) {},
		gorelkinMock:            func(m *MockGorelkin) {},
		catalogsMock:            func(m *MockCatalogs) {},

		asserts: func(t *testing.T, res *dictsParameters.DictParamsResult, err error) {
			assert.Error(t, err)
		},
	},
}

log, _ := logger.New(logger.WithEnabled(false))
for _, tc := range testcases {
	t.Run(tc.name, func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
		userProfileMock := NewMockUserProfile(ctrl)
		userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
			Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil)
		accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
		draftStorageMock := NewMockDraftStorage(ctrl)
		eventSenderMock := NewMockEventSender(ctrl)
		tc.eventSenderMock(eventSenderMock)
		tariffAggregatorMock := NewMockTariffAggregator(ctrl)
		tc.tariffAggregatorMock(tariffAggregatorMock)

		itemPlatformMock := NewMockItemPlatformClient(ctrl)
		tc.itemPlatformMock(itemPlatformMock)

		itemPlatformExpanderMock := NewMockItemPlatformExpander(ctrl)
		tc.itemPlatformExpanderMock(itemPlatformExpanderMock)

		nav := NewMockNavigationManager(ctrl)
		tc.NavManagerMock(nav, tc.data)

		frMock := NewMockFeatureRegistry(ctrl)
		frMock.EXPECT().Check(gomock.Any()).Return(false).AnyTimes()
		compositionMock := NewMockComposition(ctrl)
		compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)
		tc.composition(compositionMock)

		formManagerMock := NewMockFormManager(ctrl)
		tc.formManagerMock(formManagerMock)

		rejectionInfoGetterMock := NewMockRejectionInfoGetterInterface(ctrl)
		tc.rejectionInfoGetterMock(rejectionInfoGetterMock)

		actionsMock := NewMockPublishItemActions(ctrl)
		tc.actionsMock(actionsMock)

		userLimitsMock := NewMockUserLimits(ctrl)
		tc.userLimitsMock(userLimitsMock)

		vasMock := NewMockVas(ctrl)
		tc.vasMock(vasMock)

		togglesManager := NewMockTogglesManager(ctrl)
		if tc.togglesManagerMock != nil {
			tc.togglesManagerMock(togglesManager)
		}

		paramsProcessorMock := NewMockParamsProcessor(ctrl)
		paramsProcessorMock.EXPECT().GetParams(
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
		).Return([]paramsProcessedModels.ProcessedParam{{ID: 123}}, nil).AnyTimes()

		gorelkinMock := NewMockGorelkin(ctrl)
		tc.gorelkinMock(gorelkinMock)

		profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)

		metricsMock := NewMockMetrics(ctrl)
		hybridCacheMock := NewMockHybridCache(ctrl)
		healthMetrics := NewPublishHealthMetrics(metricsMock, hybridCacheMock)
		metricsMock.
			EXPECT().
			TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
			AnyTimes()

		compositionMock.EXPECT().
			GetInfomodelVersion(gomock.Any(), gomock.Any()).
			Return(infomodelClient.LatestVersion).
			AnyTimes()

		catalogsMock := NewMockCatalogs(ctrl)
		tc.catalogsMock(catalogsMock)

		dictsParams := New(
			log,
			draftHashVerifierMock,
			NewMockSessionIDGenerator(ctrl),
			draftStorageMock,
			userProfileMock,
			accountsHierarchyMock,
			nav,
			eventSenderMock,
			NewMockSellerAddressesClient(ctrl),
			NewMockAddressBookClient(ctrl),
			tariffAggregatorMock,
			compositionMock,
			formManagerMock,
			actionsMock,
			NewMockCoreGeo(ctrl),
			userLimitsMock,
			vasMock,
			paramsProcessorMock,
			gorelkinMock,
			NewMockGeoResolver(ctrl),
			itemPlatformMock,
			itemPlatformExpanderMock,
			profileCoreInstanceMock,
			togglesManager,
			healthMetrics,
			rejectionInfoGetterMock,
			catalogsMock,
		)
		res, err := dictsParams.Process(
			context.Background(),
			tc.data,
			tc.specs,
		)
		time.Sleep(50 * time.Millisecond)
		tc.asserts(t, res, err)
	})
}
}

func TestDictsParameters_Process_SendEvent(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(43)
userSegments := map[string]interface{}{
	"segmentationSlug": "segmentSlug",
}
draftID := int64(123)
draftHash := "a94a8fe5ccb1"
publishSessionID := "asdasdasd"
draftSessionID := "draft session id"
categoryID := int64(category.JobResume)

data := Data{
	UserID: userID,
	UserData: components.DictsParametersRequestForm{
		DraftId:          operations.Pointer[int64](draftID),
		DraftHash:        operations.Pointer(draftHash),
		PublishSessionId: &publishSessionID,
		Navigation: components.Navigation{
			CategoryId: operations.Pointer[int64](categoryID),
			Group:      operations.Pointer("group"),
			Attributes: make([]components.NavigationAttributesItem, 0),
			Config: &components.NavigationConfig{
				Branch: operations.Pointer("branch"),
				Tree:   operations.Pointer("tree"),
				Layout: operations.Pointer(resolving.PlatformIOSCreationLayout),
			},
		},
	},
	Platform: resolving.PlatformMAV,
}

testcases := []struct {
	name            string
	eventSenderMock func(m *MockEventSender)
}{
	{
		name: "send event success",
		eventSenderMock: func(m *MockEventSender) {
			m.EXPECT().ItemDraftAddStart(gomock.Any(), gomock.Any()).AnyTimes()
			m.EXPECT().ItemAddCategoryStructureLastClick(gomock.Any(), gomock.Any()).AnyTimes()
		},
	},
}

log, _ := logger.New(logger.WithEnabled(false))
for _, tc := range testcases {
	t.Run(tc.name, func(t *testing.T) {
		draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
		draftHashVerifierMock.EXPECT().Verify(gomock.Eq(draftID), gomock.Any()).Return(true)

		draftStorageMock := NewMockDraftStorage(ctrl)
		draftStorageMock.EXPECT().BindToUser(
			gomock.Any(),
			gomock.Eq(draftID),
			gomock.Eq(userID),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
		).Return(true, nil)
		draftStorageMock.EXPECT().Get(gomock.Any(), gomock.Any()).Return(
			&draftStorage.Draft{
				UserID:    &userID,
				Available: false,
				Attributes: &[]draftStorage.Attribute{
					{
						ID:    int64(dictInterfaces.Description100002),
						Value: "<br />Test string<br />",
					},
				},
				CategoryID: operations.Pointer[int64](categoryID),
				SessionID:  draftSessionID,
				Slots: &[]draftStorage.Slot{
					{
						ID:   123,
						Type: contactInfoSlot.SlotContactInfoName,
						Value: map[string]interface{}{
							dictParams.ManagerField: "test manager name",
							"some field":            123,
						},
					},
				},
			}, nil)
		draftStorageMock.EXPECT().SetAvailability(gomock.Any(), gomock.Any(), gomock.Any()).Return(true, nil)
		draftStorageMock.EXPECT().GetShouldSaveDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(false)

		userProfileMock := NewMockUserProfile(ctrl)
		userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
			Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil)
		accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
		userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
			Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil)
		navMock := NewMockNavigationManager(ctrl)
		navMock.EXPECT().FindExactNode(
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
		).Return(&infomodel.NavigationsNode{}, nil)
		navMock.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
			Return(&infomodel.NavigationsNode{}, nil)
		navMock.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil).
			SetArg(2, components.Navigation{
				CategoryId:  operations.Pointer[int64](category.JobResume),
				CategoryIds: []int64{category.JobResume},
				Config: &components.NavigationConfig{
					Tree:   operations.Pointer("mav"),
					Layout: operations.Pointer("mav_add"),
					Branch: operations.Pointer(infomodelClient.LatestVersion),
				},
				Attributes: []components.NavigationAttributesItem{
					{
						Id:    232323,
						Value: 4545454,
					},
					{
						Id:    787878,
						Value: 90909090,
					},
				},
				Title:       operations.Pointer("Работа & Резюме"),
				Description: operations.Pointer("Резюме"),
			})
		navMock.EXPECT().GetChainOfNavNames(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
			Return(nil, nil).AnyTimes()
		navMock.EXPECT().GetCategoryByID(gomock.Any(), gomock.Any(), gomock.Any()).
			Return(nil, nil).AnyTimes()
		navMock.EXPECT().FindNodeByAttributes(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
			Return(nil, fmt.Errorf("not found")).AnyTimes()
		navMock.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)

		eventSenderMock := NewMockEventSender(ctrl)
		tc.eventSenderMock(eventSenderMock)

		tariffAggregatorMock := NewMockTariffAggregator(ctrl)
		tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).
			Return(false, nil)

		frMock := NewMockFeatureRegistry(ctrl)
		frMock.EXPECT().Check(gomock.Any()).Return(false).AnyTimes()
		compositionMock := NewMockComposition(ctrl)
		compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)

		compositionMock.EXPECT().
			GetInfomodelVersion(gomock.Any(), gomock.Any()).
			Return(infomodelClient.LatestVersion).
			AnyTimes()
		compositionMock.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
		compositionMock.EXPECT().GetV5FormBuild(gomock.Any(), gomock.Any()).
			Return(
				&infomodelValidation.FormResponseV5{
					Form: []infomodelValidation.FormFieldV2Response{
						{
							Data: infomodelValidation.FormFieldResponseData{
								Id: 12345,
							},
						},
					},
				},
				nil,
			)
		compositionMock.EXPECT().AppendInfomodelCatalogValues(gomock.Any(), gomock.Any(), "", "", gomock.Any()).AnyTimes()

		formManagerMock := NewMockFormManager(ctrl)
		formManagerMock.EXPECT().ModifyFormBeforeBuild(gomock.Any(), gomock.Any()).Return(nil)
		formManagerMock.EXPECT().ModifyFormAfterBuild(gomock.Any(), gomock.Any()).Return(nil)

		actionMock := NewMockPublishItemActions(ctrl)
		actionMock.EXPECT().
			GetSlots(
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
			).
			Return([]slot.Slot{}, nil)

		togglesMock := NewMockTogglesManager(ctrl)
		togglesMock.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)
		togglesMock.EXPECT().GetBool("sellerx_dicts_parameters_parse_params_v2").Return(true, nil)

		paramsProcessorMock := NewMockParamsProcessor(ctrl)
		paramsProcessorMock.EXPECT().GetParams(
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
		).Return([]paramsProcessedModels.ProcessedParam{{ID: 123}}, nil).AnyTimes()

		gorelkinMock := NewMockGorelkin(ctrl)
		gorelkinMock.EXPECT().ProcessSteps(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)

		profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
		profileCoreInstanceMock.EXPECT().GetProfessionalInfo(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)

		itemPlatformExpanderMock := NewMockItemPlatformExpander(ctrl)
		itemPlatformExpanderMock.EXPECT().Expand(gomock.Any(), gomock.Any()).Return(nil)
		sessionIDGenerator := NewMockSessionIDGenerator(ctrl)
		sessionIDGenerator.EXPECT().Generate(userID, gomock.Any()).Return("")

		metricsMock := NewMockMetrics(ctrl)
		healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
		metricsMock.
			EXPECT().
			TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
			AnyTimes()

		navMock.EXPECT().FindExactNode(
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
		).Return(&infomodel.NavigationsNode{}, nil).AnyTimes()

		compositionMock.EXPECT().
			GetInfomodelVersion(gomock.Any(), gomock.Any()).
			Return(infomodelClient.LatestVersion).
			AnyTimes()

		catalogsMock := NewMockCatalogs(ctrl)
		catalogsMock.EXPECT().GetCatalogUIDByParams(gomock.Any(), &infomodelValidation.FormResponseV5{
			Form: []infomodelValidation.FormFieldV2Response{
				{
					Data: infomodelValidation.FormFieldResponseData{
						Id: 12345,
					},
				},
			},
		}).Return("", "", nil)

		dictsParams := New(
			log,
			draftHashVerifierMock,
			sessionIDGenerator,
			draftStorageMock,
			userProfileMock,
			accountsHierarchyMock,
			navMock,
			eventSenderMock,
			NewMockSellerAddressesClient(ctrl),
			NewMockAddressBookClient(ctrl),
			tariffAggregatorMock,
			compositionMock,
			formManagerMock,
			actionMock,
			NewMockCoreGeo(ctrl),
			NewMockUserLimits(ctrl),
			NewMockVas(ctrl),
			paramsProcessorMock,
			gorelkinMock,
			NewMockGeoResolver(ctrl),
			NewMockItemPlatformClient(ctrl),
			itemPlatformExpanderMock,
			profileCoreInstanceMock,
			togglesMock,
			healthMetrics,
			NewMockRejectionInfoGetterInterface(ctrl),
			catalogsMock,
		)
		result, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

		assert.NotNil(t, result)
		assert.NoError(t, err)
	})
}
}

func TestDictsParameters_Process_GetNode(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(123)
userSegments := map[string]interface{}{
	"segmentationSlug": "segmentSlug",
}
data := Data{
	UserID: userID,
	UserData: components.DictsParametersRequestForm{
		Navigation: components.Navigation{
			CategoryId: operations.Pointer[int64](int64(category.AnimalsAqua)),
			Group:      operations.Pointer("group"),
			Attributes: make([]components.NavigationAttributesItem, 0),
			Config: &components.NavigationConfig{
				Branch: operations.Pointer("branch"),
				Tree:   operations.Pointer("tree"),
			},
		},
	},
	Platform: resolving.PlatformMAV,
}

errTest := errors.New("test error")

testcases := []struct {
	name        string
	err         error
	navMock     func(m *MockNavigationManager)
	composition func(m *MockComposition)
}{
	{
		name: "error find node",
		err:  errTest,
		navMock: func(m *MockNavigationManager) {
			m.EXPECT().FindExactNode(
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
			).Return(nil, errTest)
			m.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)
		},
		composition: func(m *MockComposition) {
			m.EXPECT().
				GetInfomodelVersion(gomock.Any(), gomock.Any()).
				Return(infomodelClient.LatestVersion).
				AnyTimes()
			m.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
		},
	},
	{
		name: "node not found",
		err:  friendlyError.ErrNodeNotFound(nil),
		navMock: func(m *MockNavigationManager) {
			m.EXPECT().FindExactNode(
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
			).Return(nil, nil)
			m.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)
		},
		composition: func(m *MockComposition) {
			m.EXPECT().
				GetInfomodelVersion(gomock.Any(), gomock.Any()).
				Return(infomodelClient.LatestVersion).
				AnyTimes()
			m.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
		},
	},
	{
		name: "error find vertical node",
		err:  errTest,
		navMock: func(m *MockNavigationManager) {
			m.EXPECT().FindExactNode(
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
			).Return(&infomodel.NavigationsNode{
				Config: infomodel.NavigationsNodeConfig{
					Category: operations.Pointer[int64](category.RealEstateFlats),
				},
			}, nil)

			m.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(nil, errTest)

			m.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil).AnyTimes()
			m.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)
		},
		composition: func(m *MockComposition) {
			m.EXPECT().
				GetInfomodelVersion(gomock.Any(), gomock.Any()).
				Return(infomodelClient.LatestVersion).
				AnyTimes()
			m.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
		},
	},
	{
		name: "vertical node not found",
		err:  friendlyError.ErrVerticalNodeNotFound(nil),
		navMock: func(m *MockNavigationManager) {
			m.EXPECT().FindExactNode(
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
				gomock.Any(),
			).Return(&infomodel.NavigationsNode{
				Config: infomodel.NavigationsNodeConfig{
					Category: operations.Pointer[int64](category.RealEstateFlats),
				},
			}, nil)

			m.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil).AnyTimes()
			m.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(nil, nil).AnyTimes()
			m.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)
		},
		composition: func(m *MockComposition) {
			m.EXPECT().
				GetInfomodelVersion(gomock.Any(), gomock.Any()).
				Return(infomodelClient.LatestVersion).
				AnyTimes()
			m.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
		},
	},
}

log, _ := logger.New(logger.WithEnabled(false))
for _, tc := range testcases {
	t.Run(tc.name, func(t *testing.T) {
		draftStorageMock := NewMockDraftStorage(ctrl)
		draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
		userProfileMock := NewMockUserProfile(ctrl)
		userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
			Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil).AnyTimes()
		accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
		navMock := NewMockNavigationManager(ctrl)
		tc.navMock(navMock)
		eventSenderMock := NewMockEventSender(ctrl)
		tariffAggregatorMock := NewMockTariffAggregator(ctrl)
		tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).Return(false, nil).AnyTimes()
		compositionMock := NewMockComposition(ctrl)
		frMock := NewMockFeatureRegistry(ctrl)
		frMock.EXPECT().Check(gomock.Any()).Return(false).AnyTimes()
		compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)
		tc.composition(compositionMock)

		profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)

		metricsMock := NewMockMetrics(ctrl)
		hybridCacheMock := NewMockHybridCache(ctrl)
		hybridCacheMock.EXPECT().Get(gomock.Any()).Return(nil, false).AnyTimes()
		hybridCacheMock.EXPECT().Put(gomock.Any(), gomock.Any()).AnyTimes()
		healthMetrics := NewPublishHealthMetrics(metricsMock, hybridCacheMock)
		metricsMock.
			EXPECT().
			TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
			AnyTimes()

		compositionMock.EXPECT().
			GetInfomodelVersion(gomock.Any(), gomock.Any()).
			Return(infomodelClient.LatestVersion).
			AnyTimes()
		navMock.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil).AnyTimes()

		catalogsMock := NewMockCatalogs(ctrl)

		togglesManager := NewMockTogglesManager(ctrl)
		togglesManager.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)

		dictsParams := New(
			log,
			draftHashVerifierMock,
			NewMockSessionIDGenerator(ctrl),
			draftStorageMock,
			userProfileMock,
			accountsHierarchyMock,
			navMock,
			eventSenderMock,
			NewMockSellerAddressesClient(ctrl),
			NewMockAddressBookClient(ctrl),
			tariffAggregatorMock,
			compositionMock,
			NewMockFormManager(ctrl),
			NewMockPublishItemActions(ctrl),
			NewMockCoreGeo(ctrl),
			NewMockUserLimits(ctrl),
			NewMockVas(ctrl),
			NewMockParamsProcessor(ctrl),
			NewMockGorelkin(ctrl),
			NewMockGeoResolver(ctrl),
			NewMockItemPlatformClient(ctrl),
			NewMockItemPlatformExpander(ctrl),
			profileCoreInstanceMock,
			togglesManager,
			healthMetrics,
			NewMockRejectionInfoGetterInterface(ctrl),
			catalogsMock,
		)
		_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

		assert.Error(t, err)
		assert.Equal(t, tc.err, err)
	})
}
}

func TestDictsParameters_ModifyFormBeforeBuild_Error(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(123)
userSegments := map[string]interface{}{
	"segmentationSlug": "segmentSlug",
}
data := Data{
	UserID: userID,
	UserData: components.DictsParametersRequestForm{
		Navigation: components.Navigation{
			CategoryId: operations.Pointer[int64](int64(category.AnimalsAqua)),
			Group:      operations.Pointer("group"),
			Attributes: make([]components.NavigationAttributesItem, 0),
			Config: &components.NavigationConfig{
				Branch: operations.Pointer("branch"),
				Tree:   operations.Pointer("tree"),
			},
		},
		PublishSessionId: operations.Pointer("sessionId"),
	},
	Platform: resolving.PlatformMAV,
}

draftStorageMock := NewMockDraftStorage(ctrl)
draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
userProfileMock := NewMockUserProfile(ctrl)
userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
	Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil)
accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
nav := NewMockNavigationManager(ctrl)
nav.EXPECT().FindExactNode(
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
	gomock.Any(),
).Return(&infomodel.NavigationsNode{}, nil)
nav.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
	Return(&infomodel.NavigationsNode{}, nil)
nav.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
nav.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)
eventSenderMock := NewMockEventSender(ctrl)
tariffAggregatorMock := NewMockTariffAggregator(ctrl)
tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).Return(false, nil)
compositionMock := NewMockComposition(ctrl)
compositionMock.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
compositionMock.EXPECT().
	GetInfomodelVersion(gomock.Any(), gomock.Any()).
	Return(infomodelClient.LatestVersion).
	AnyTimes()
frMock := NewMockFeatureRegistry(ctrl)
frMock.EXPECT().Check(gomock.Any()).Return(false).AnyTimes()
compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)

formManagerMock := NewMockFormManager(ctrl)
formManagerMock.EXPECT().ModifyFormBeforeBuild(gomock.Any(), gomock.Any()).Return(errors.New("test error"))

itemPlatformMock := NewMockItemPlatformClient(ctrl)
itemPlatformExpanderMock := NewMockItemPlatformExpander(ctrl)
itemPlatformExpanderMock.EXPECT().Expand(gomock.Any(), gomock.Any()).Return(nil)

profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)

metricsMock := NewMockMetrics(ctrl)
hybridCacheMock := NewMockHybridCache(ctrl)
hybridCacheMock.EXPECT().Get(gomock.Any()).Return(nil, false).Times(1)
hybridCacheMock.EXPECT().Put(gomock.Any(), gomock.Any()).Times(1)
healthMetrics := NewPublishHealthMetrics(metricsMock, hybridCacheMock)
metricsMock.
	EXPECT().
	TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
	AnyTimes()

catalogsMock := NewMockCatalogs(ctrl)

togglesManager := NewMockTogglesManager(ctrl)
togglesManager.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)
togglesManager.EXPECT().GetBool("sellerx_dicts_parameters_parse_params_v2").Return(true, nil)

log, _ := logger.New(logger.WithEnabled(false))
dictsParams := New(
	log,
	draftHashVerifierMock,
	NewMockSessionIDGenerator(ctrl),
	draftStorageMock,
	userProfileMock,
	accountsHierarchyMock,
	nav,
	eventSenderMock,
	NewMockSellerAddressesClient(ctrl),
	NewMockAddressBookClient(ctrl),
	tariffAggregatorMock,
	compositionMock,
	formManagerMock,
	NewMockPublishItemActions(ctrl),
	NewMockCoreGeo(ctrl),
	NewMockUserLimits(ctrl),
	NewMockVas(ctrl),
	NewMockParamsProcessor(ctrl),
	NewMockGorelkin(ctrl),
	NewMockGeoResolver(ctrl),
	itemPlatformMock,
	itemPlatformExpanderMock,
	profileCoreInstanceMock,
	togglesManager,
	healthMetrics,
	NewMockRejectionInfoGetterInterface(ctrl),
	catalogsMock,
)
_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

assert.Error(t, err)
}

func TestDictsParameters_BuildV5_Error(t *testing.T) {
ctrl := gomock.NewController(t)
defer ctrl.Finish()

userID := int64(123)
userSegments := map[string]interface{}{
	"segmentationSlug": "segmentSlug",
}
data := Data{
	UserID: userID,
	UserData: components.DictsParametersRequestForm{
		Navigation: components.Navigation{
			CategoryId: operations.Pointer[int64](int64(category.AnimalsAqua)),
			Group:      operations.Pointer("group"),
			Attributes: []components.NavigationAttributesItem{
				{
					Id:    int64(1),
					Value: int64(4),
				},
				{
					Id:    int64(2),
					Value: int64(5),
				},
			},
			Config: &components.NavigationConfig{
				Branch: operations.Pointer("branch"),
				Tree:   operations.Pointer("tree"),
				Layout: operations.Pointer(resolving.PlatformAndroidCreationLayout),
				},
			},
			Params: map[string]interface{}{
				"1":               12,
				"3":               6,
				"[{\"1\":12345}]": "[{\"1\":12345}]",
			},
			PublishSessionId: operations.Pointer("sessionId"),
		},
		Platform: resolving.PlatformMAV,
	}

	draftStorageMock := NewMockDraftStorage(ctrl)
	draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
	userProfileMock := NewMockUserProfile(ctrl)
	userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
		Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil)
	accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
	nav := NewMockNavigationManager(ctrl)
	nav.EXPECT().FindExactNode(
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
	).Return(&infomodel.NavigationsNode{}, nil)
	nav.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(&infomodel.NavigationsNode{}, nil)
	nav.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
	nav.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)
	eventSenderMock := NewMockEventSender(ctrl)
	tariffAggregatorMock := NewMockTariffAggregator(ctrl)
	tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).Return(false, nil)

	compositionMock := NewMockComposition(ctrl)
	compositionMock.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
	compositionMock.EXPECT().GetV5FormBuild(gomock.Any(), gomock.Any()).
		Return(
			&infomodelValidation.FormResponseV5{
				Form: []infomodelValidation.FormFieldV2Response{
					{
						Data: infomodelValidation.FormFieldResponseData{
							Id: 12345,
						},
					},
				},
			},
			nil,
		)
	compositionMock.EXPECT().AppendInfomodelCatalogValues(gomock.Any(), gomock.Any(), "", "", gomock.Any())
	compositionMock.EXPECT().
		GetInfomodelVersion(gomock.Any(), gomock.Any()).
		Return(infomodelClient.LatestVersion).
		AnyTimes()
	frMock := NewMockFeatureRegistry(ctrl)
	frMock.EXPECT().Check(gomock.Any()).Return(false).AnyTimes()
	compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)

	formManagerMock := NewMockFormManager(ctrl)
	formManagerMock.EXPECT().ModifyFormBeforeBuild(gomock.Any(), gomock.Any()).Return(nil)
	formManagerMock.EXPECT().ModifyFormAfterBuild(gomock.Any(), gomock.Any()).Return(errors.New("test error"))

	publishItemActionsMock := NewMockPublishItemActions(ctrl)
	publishItemActionsMock.EXPECT().GetSlots(
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
	).Return(nil, nil)

	vasMock := NewMockVas(ctrl)

	userLimitsMock := NewMockUserLimits(ctrl)

	itemPlatformMock := NewMockItemPlatformClient(ctrl)
	itemPlatformExpanderMock := NewMockItemPlatformExpander(ctrl)
	itemPlatformExpanderMock.EXPECT().Expand(gomock.Any(), gomock.Any()).Return(nil)
	profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
	metricsMock := NewMockMetrics(ctrl)
	hybridCacheMock := NewMockHybridCache(ctrl)
	hybridCacheMock.EXPECT().Get(gomock.Any()).Return(nil, false).Times(1)
	hybridCacheMock.EXPECT().Put(gomock.Any(), gomock.Any()).Times(1)
	healthMetrics := NewPublishHealthMetrics(metricsMock, hybridCacheMock)
	metricsMock.
		EXPECT().
		TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		AnyTimes()

	togglesManager := NewMockTogglesManager(ctrl)
	togglesManager.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)
	togglesManager.EXPECT().GetBool("sellerx_dicts_parameters_parse_params_v2").Return(true, nil)

	catalogsMock := NewMockCatalogs(ctrl)
	catalogsMock.EXPECT().GetCatalogUIDByParams(gomock.Any(), gomock.Any())

	log, _ := logger.New(logger.WithEnabled(false))
	dictsParams := New(
		log,
		draftHashVerifierMock,
		NewMockSessionIDGenerator(ctrl),
		draftStorageMock,
		userProfileMock,
		accountsHierarchyMock,
		nav,
		eventSenderMock,
		NewMockSellerAddressesClient(ctrl),
		NewMockAddressBookClient(ctrl),
		tariffAggregatorMock,
		compositionMock,
		formManagerMock,
		publishItemActionsMock,
		NewMockCoreGeo(ctrl),
		userLimitsMock,
		vasMock,
		NewMockParamsProcessor(ctrl),
		NewMockGorelkin(ctrl),
		NewMockGeoResolver(ctrl),
		itemPlatformMock,
		itemPlatformExpanderMock,
		profileCoreInstanceMock,
		togglesManager,
		healthMetrics,
		NewMockRejectionInfoGetterInterface(ctrl),
		catalogsMock,
	)

	_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

	assert.Error(t, err)
}

func TestDictsParameters_ModifyFormAfterBuild_Error(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	userID := int64(123)
	userSegments := map[string]interface{}{
		"segmentationSlug": "segmentSlug",
	}

	data := Data{
		UserID: userID,
		UserData: components.DictsParametersRequestForm{
			Navigation: components.Navigation{
				CategoryId: operations.Pointer[int64](int64(category.AnimalsAqua)),
				Group:      operations.Pointer("group"),
				Attributes: []components.NavigationAttributesItem{
					{
						Id:    int64(1),
						Value: int64(4),
					},
					{
						Id:    int64(2),
						Value: int64(5),
					},
				},
				Config: &components.NavigationConfig{
					Branch: operations.Pointer("branch"),
					Tree:   operations.Pointer("tree"),
					Layout: operations.Pointer(resolving.PlatformAndroidCreationLayout),
				},
			},
			Params: map[string]interface{}{
				"1":               12,
				"3":               6,
				"[{\"1\":12345}]": "[{\"1\":12345}]",
			},
			PublishSessionId: operations.Pointer("sessionId"),
		},
		Platform: resolving.PlatformMAV,
	}

	draftStorageMock := NewMockDraftStorage(ctrl)
	draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
	userProfileMock := NewMockUserProfile(ctrl)
	userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
		Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil)
	accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
	nav := NewMockNavigationManager(ctrl)
	nav.EXPECT().FindExactNode(
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
	).Return(&infomodel.NavigationsNode{}, nil)
	nav.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(&infomodel.NavigationsNode{}, nil)
	nav.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
	nav.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)
	eventSenderMock := NewMockEventSender(ctrl)
	tariffAggregatorMock := NewMockTariffAggregator(ctrl)
	tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).Return(false, nil)

	compositionMock := NewMockComposition(ctrl)
	compositionMock.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
	compositionMock.EXPECT().GetV5FormBuild(gomock.Any(), gomock.Any()).
		Return(
			nil,
			errors.New("test error"),
		)
	compositionMock.EXPECT().
		GetInfomodelVersion(gomock.Any(), gomock.Any()).
		Return(infomodelClient.LatestVersion).
		AnyTimes()
	frMock := NewMockFeatureRegistry(ctrl)
	frMock.EXPECT().Check(gomock.Any()).Return(false).AnyTimes()
	compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)

	formManagerMock := NewMockFormManager(ctrl)
	formManagerMock.EXPECT().ModifyFormBeforeBuild(gomock.Any(), gomock.Any()).Return(nil)

	publishItemActionsMock := NewMockPublishItemActions(ctrl)
	publishItemActionsMock.EXPECT().GetSlots(
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
	).Return(nil, nil)

	vasMock := NewMockVas(ctrl)

	userLimitsMock := NewMockUserLimits(ctrl)

	itemPlatformMock := NewMockItemPlatformClient(ctrl)

	itemPlatformExpanderMock := NewMockItemPlatformExpander(ctrl)
	itemPlatformExpanderMock.EXPECT().Expand(gomock.Any(), gomock.Any()).Return(nil)
	profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
	metricsMock := NewMockMetrics(ctrl)
	hybridCacheMock := NewMockHybridCache(ctrl)
	hybridCacheMock.EXPECT().Get(gomock.Any()).Return(nil, false).Times(1)
	hybridCacheMock.EXPECT().Put(gomock.Any(), gomock.Any()).Times(1)
	healthMetrics := NewPublishHealthMetrics(metricsMock, hybridCacheMock)
	metricsMock.
		EXPECT().
		TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		AnyTimes()

	togglesManager := NewMockTogglesManager(ctrl)
	togglesManager.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)
	togglesManager.EXPECT().GetBool("sellerx_dicts_parameters_parse_params_v2").Return(true, nil)

	catalogsMock := NewMockCatalogs(ctrl)

	log, _ := logger.New(logger.WithEnabled(false))
	dictsParams := New(
		log,
		draftHashVerifierMock,
		NewMockSessionIDGenerator(ctrl),
		draftStorageMock,
		userProfileMock,
		accountsHierarchyMock,
		nav,
		eventSenderMock,
		NewMockSellerAddressesClient(ctrl),
		NewMockAddressBookClient(ctrl),
		tariffAggregatorMock,
		compositionMock,
		formManagerMock,
		publishItemActionsMock,
		NewMockCoreGeo(ctrl),
		userLimitsMock,
		vasMock,
		NewMockParamsProcessor(ctrl),
		NewMockGorelkin(ctrl),
		NewMockGeoResolver(ctrl),
		itemPlatformMock,
		itemPlatformExpanderMock,
		profileCoreInstanceMock,
		togglesManager,
		healthMetrics,
		NewMockRejectionInfoGetterInterface(ctrl),
		catalogsMock,
	)

	_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

	assert.Error(t, err)
}

func TestDictsParameters_Process_CoreGeoError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	userID := int64(123)
	userSegments := map[string]interface{}{
		"segmentationSlug": "segmentSlug",
	}
	itemID := int64(890)
	params := map[string]interface{}{
		"7":               10,
		"8":               11,
		"[{\"1\":12345}]": "[{\"1\":12345}]",
		strconv.Itoa(avito.IdentifikatoryAdresov110064): 123,
	}

	data := Data{
		UserID: userID,
		UserData: components.DictsParametersRequestForm{
			ItemId: operations.Pointer[int64](itemID),
			Navigation: components.Navigation{
				CategoryId: operations.Pointer[int64](int64(category.AnimalsAqua)),
				Group:      operations.Pointer("group"),
				Attributes: []components.NavigationAttributesItem{
					{
						Id:    int64(1),
						Value: int64(4),
					},
					{
						Id:    int64(2),
						Value: int64(5),
					},
				},
				Config: &components.NavigationConfig{
					Branch: operations.Pointer("branch"),
					Tree:   operations.Pointer("tree"),
					Layout: operations.Pointer(resolving.PlatformAndroidEditLayout),
				},
			},
			Params: map[string]interface{}{},
		},
		Platform: resolving.PlatformMAV,
	}

	draftStorageMock := NewMockDraftStorage(ctrl)
	draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
	userProfileMock := NewMockUserProfile(ctrl)
	userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
		Return(
			&userProfile.User{
				ID:        userID,
				IsCompany: operations.Pointer(true),
			}, nil)
	accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
	nav := NewMockNavigationManager(ctrl)
	nav.EXPECT().FindExactNode(
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
	).Return(&infomodel.NavigationsNode{}, nil)
	nav.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(&infomodel.NavigationsNode{}, nil)
	nav.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
	nav.EXPECT().GetCategoryByID(gomock.Any(), gomock.Any(), gomock.Any()).Return(&infomodelModel.Category{Slug: "slug"}, nil).AnyTimes()
	nav.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)

	eventSenderMock := NewMockEventSender(ctrl)
	tariffAggregatorMock := NewMockTariffAggregator(ctrl)
	tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).Return(false, nil)

	compositionMock := NewMockComposition(ctrl)
	compositionMock.EXPECT().GetInfomodelVersion(gomock.Any(), gomock.Any()).
		Return("").AnyTimes()
	compositionMock.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
	compositionMock.EXPECT().GetV5FormBuild(gomock.Any(), gomock.Any()).
		Return(
			&infomodelValidation.FormResponseV5{},
			nil,
		)
	compositionMock.EXPECT().AppendInfomodelCatalogValues(gomock.Any(), gomock.Any(), "", "", gomock.Any())
	frMock := NewMockFeatureRegistry(ctrl)
	frMock.EXPECT().Check(gomock.Any()).Return(false).Times(2)
	compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)

	formManagerMock := NewMockFormManager(ctrl)
	formManagerMock.EXPECT().ModifyFormBeforeBuild(gomock.Any(), gomock.Any()).Return(nil)
	formManagerMock.EXPECT().ModifyFormAfterBuild(gomock.Any(), gomock.Any()).Return(nil)

	geoMock := NewMockCoreGeo(ctrl)
	geoMock.EXPECT().IsNeedCheckAddressQuality(gomock.Any(), gomock.Any(), gomock.Any()).Return(true)
	geoMock.EXPECT().IsAddressQualitative(gomock.Any(), gomock.Any(), gomock.Any()).
		Return(false, errors.New("test error"))

	actionsMock := NewMockPublishItemActions(ctrl)
	actionsMock.EXPECT().
		GetSlots(
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
		).
		Return([]slot.Slot{}, nil)

	vasMock := NewMockVas(ctrl)
	vasMock.EXPECT().GetActiveVas(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)

	userLimitsMock := NewMockUserLimits(ctrl)

	itemPlatformMock := NewMockItemPlatformClient(ctrl)
	itemPlatformMock.EXPECT().GetByID(gomock.Any(), gomock.Eq(itemID), gomock.Eq(itemPlatform.ParamCollectionPublish)).
		Return(
			&itemPlatform.Item{
				ID:         itemID,
				StatusID:   operations.Pointer[int64](itemPlatformBrief.STATUSES_EXPIRED),
				UserID:     &userID,
				CategoryID: operations.Pointer[int64](category.AnimalsAqua),
				LocationID: operations.Pointer[int64](int64(location.MoscowRegion)),
				Params:     params,
			}, nil)
	itemPlatformExpanderMock := NewMockItemPlatformExpander(ctrl)
	profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
	paramsProcessorMock := NewMockParamsProcessor(ctrl)
	gorelkinMock := NewMockGorelkin(ctrl)

	metricsMock := NewMockMetrics(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
	metricsMock.
		EXPECT().
		TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		AnyTimes()
	catalogsMock := NewMockCatalogs(ctrl)
	catalogsMock.EXPECT().GetCatalogUIDByParams(gomock.Any(), gomock.Any())

	togglesManager := NewMockTogglesManager(ctrl)
	togglesManager.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)
	togglesManager.EXPECT().GetBool("sellerx_dicts_parameters_parse_params_v2").Return(true, nil)

	log, _ := logger.New(logger.WithEnabled(false))
	dictsParams := New(
		log,
		draftHashVerifierMock,
		NewMockSessionIDGenerator(ctrl),
		draftStorageMock,
		userProfileMock,
		accountsHierarchyMock,
		nav,
		eventSenderMock,
		NewMockSellerAddressesClient(ctrl),
		NewMockAddressBookClient(ctrl),
		tariffAggregatorMock,
		compositionMock,
		formManagerMock,
		actionsMock,
		geoMock,
		userLimitsMock,
		vasMock,
		paramsProcessorMock,
		gorelkinMock,
		NewMockGeoResolver(ctrl),
		itemPlatformMock,
		itemPlatformExpanderMock,
		profileCoreInstanceMock,
		togglesManager,
		healthMetrics,
		NewMockRejectionInfoGetterInterface(ctrl),
		catalogsMock,
	)
	_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

	assert.Error(t, err)
}

func TestDictsParameters_Process_SlotsError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	userID := int64(123)
	userSegments := map[string]interface{}{
		"segmentationSlug": "segmentSlug",
	}
	itemID := int64(890)
	params := map[string]interface{}{
		"7":               10,
		"8":               11,
		"[{\"1\":12345}]": "[{\"1\":12345}]",
		strconv.Itoa(avito.IdentifikatoryAdresov110064): 123,
	}

	data := Data{
		UserID: userID,
		UserData: components.DictsParametersRequestForm{
			ItemId: operations.Pointer[int64](itemID),
			Navigation: components.Navigation{
				CategoryId: operations.Pointer[int64](int64(category.AnimalsAqua)),
				Group:      operations.Pointer("group"),
				Attributes: []components.NavigationAttributesItem{
					{
						Id:    int64(1),
						Value: int64(4),
					},
					{
						Id:    int64(2),
						Value: int64(5),
					},
				},
				Config: &components.NavigationConfig{
					Branch: operations.Pointer("branch"),
					Tree:   operations.Pointer("tree"),
					Layout: operations.Pointer(resolving.PlatformAndroidEditLayout),
				},
			},
			Params: map[string]interface{}{},
		},
		Platform: resolving.PlatformMAV,
	}

	draftStorageMock := NewMockDraftStorage(ctrl)
	draftHashVerifierMock := NewMockDraftHashVerifier(ctrl)
	userProfileMock := NewMockUserProfile(ctrl)
	userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
		Return(
			&userProfile.User{
				ID:        userID,
				IsCompany: operations.Pointer(true),
			}, nil)
	accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
	nav := NewMockNavigationManager(ctrl)
	nav.EXPECT().FindExactNode(
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
		gomock.Any(),
	).Return(&infomodel.NavigationsNode{}, nil)
	nav.EXPECT().FindVerticalNode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(&infomodel.NavigationsNode{}, nil)
	nav.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
	nav.EXPECT().GetCategoryByID(gomock.Any(), gomock.Any(), gomock.Any()).Return(&infomodelModel.Category{Slug: "slug"}, nil).AnyTimes()
	nav.EXPECT().UpdateNavigation(gomock.Any(), gomock.Any()).Return(nil, nil)

	eventSenderMock := NewMockEventSender(ctrl)
	tariffAggregatorMock := NewMockTariffAggregator(ctrl)
	tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).Return(false, nil)

	compositionMock := NewMockComposition(ctrl)
	compositionMock.EXPECT().GetInfomodelVersion(gomock.Any(), gomock.Any()).
		Return("").AnyTimes()
	compositionMock.EXPECT().UserSegments(gomock.Any(), userID).Return(userSegments, nil)
	compositionMock.EXPECT().GetV5FormBuild(gomock.Any(), gomock.Any()).
		Return(
			&infomodelValidation.FormResponseV5{},
			nil,
		)
	frMock := NewMockFeatureRegistry(ctrl)
	frMock.EXPECT().Check(gomock.Any()).Return(false).Times(2)
	compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)

	formManagerMock := NewMockFormManager(ctrl)
	formManagerMock.EXPECT().ModifyFormBeforeBuild(gomock.Any(), gomock.Any()).Return(nil)

	geoMock := NewMockCoreGeo(ctrl)

	actionsMock := NewMockPublishItemActions(ctrl)
	actionsMock.EXPECT().
		GetSlots(
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
			gomock.Any(),
		).
		Return(nil, fmt.Errorf("an error"))

	vasMock := NewMockVas(ctrl)
	vasMock.EXPECT().GetActiveVas(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)

	userLimitsMock := NewMockUserLimits(ctrl)

	itemPlatformMock := NewMockItemPlatformClient(ctrl)
	itemPlatformMock.EXPECT().GetByID(gomock.Any(), gomock.Eq(itemID), gomock.Eq(itemPlatform.ParamCollectionPublish)).
		Return(
			&itemPlatform.Item{
				ID:         itemID,
				StatusID:   operations.Pointer[int64](itemPlatformBrief.STATUSES_EXPIRED),
				UserID:     &userID,
				CategoryID: operations.Pointer[int64](category.AnimalsAqua),
				LocationID: operations.Pointer[int64](int64(location.MoscowRegion)),
				Params:     params,
			}, nil)
	itemPlatformExpanderMock := NewMockItemPlatformExpander(ctrl)

	profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
	metricsMock := NewMockMetrics(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
	metricsMock.
		EXPECT().
		TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		AnyTimes()

	togglesManager := NewMockTogglesManager(ctrl)
	togglesManager.EXPECT().GetBool(navigationManager.EnableUpdateNavigationEdit).Return(true, nil)
	togglesManager.EXPECT().GetBool("sellerx_dicts_parameters_parse_params_v2").Return(true, nil)

	catalogsMock := NewMockCatalogs(ctrl)

	log, _ := logger.New(logger.WithEnabled(false))
	dictsParams := New(
		log,
		draftHashVerifierMock,
		NewMockSessionIDGenerator(ctrl),
		draftStorageMock,
		userProfileMock,
		accountsHierarchyMock,
		nav,
		eventSenderMock,
		NewMockSellerAddressesClient(ctrl),
		NewMockAddressBookClient(ctrl),
		tariffAggregatorMock,
		compositionMock,
		formManagerMock,
		actionsMock,
		geoMock,
		userLimitsMock,
		vasMock,
		NewMockParamsProcessor(ctrl),
		NewMockGorelkin(ctrl),
		NewMockGeoResolver(ctrl),
		itemPlatformMock,
		itemPlatformExpanderMock,
		profileCoreInstanceMock,
		togglesManager,
		healthMetrics,
		NewMockRejectionInfoGetterInterface(ctrl),
		catalogsMock,
	)
	_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

	assert.Error(t, err)
}

func TestDictsParameters_GetEditCategoryFlag(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	itemID := int64(123)
	newCategoryID := int64(321)
	params := map[string]interface{}{
		"test":  true,
		"test2": "yes",
	}

	targetErr := errors.New("test")

	testData := []struct {
		name                    string
		newCategoryID           int64
		item                    *itemPlatform.Item
		navigation              components.Navigation
		rejectionInfoGetterMock func(m *MockRejectionInfoGetterInterface)
		userLimitsMock          func(u *MockUserLimits)
		vasMock                 func(v *MockVas)

		expectedResult bool
		expectedErr    error

		assertItem func(t *testing.T, item *itemPlatform.Item)
	}{
		{
			name:                    "nil_item",
			newCategoryID:           category.RealEstateFlats,
			item:                    nil,
			rejectionInfoGetterMock: func(m *MockRejectionInfoGetterInterface) {},
			userLimitsMock:          func(u *MockUserLimits) {},
			vasMock:                 func(v *MockVas) {},

			expectedResult: false,
			expectedErr:    nil,
		},
		{
			name:          "rejection_info_getter_error",
			newCategoryID: newCategoryID,
			navigation: components.Navigation{
				Config: &components.NavigationConfig{
					Tree:   operations.Pointer("test_tree"),
					Branch: operations.Pointer("test_branch"),
				},
			},
			item: &itemPlatform.Item{
				ID:         itemID,
				StatusID:   operations.Pointer[int64](itemPlatformBrief.STATUSES_REJECTED),
				CategoryID: &newCategoryID,
				Params:     params,
			},
			rejectionInfoGetterMock: func(m *MockRejectionInfoGetterInterface) {
				m.EXPECT().Get(gomock.Any(), rejectionInfoGetter.RejectionInfoRequest{
					Item: rejectionInfoGetter.RejectionInfoRequestItem{
						ID:         itemID,
						CategoryID: newCategoryID,
						Params:     params,
					},
					InfomodelVersion: "test_branch",
					Tree:             "test_tree",
				}).Return(rejectionInfoGetter.RejectionInfo{}, targetErr)
			},
			userLimitsMock: func(u *MockUserLimits) {},
			vasMock:        func(v *MockVas) {},

			expectedResult: false,
			expectedErr:    targetErr,
		},
		{
			name:          "item_rejected_by_wrong_category",
			newCategoryID: newCategoryID,
			navigation: components.Navigation{
				Config: &components.NavigationConfig{
					Tree:   operations.Pointer("test_tree"),
					Branch: operations.Pointer("test_branch"),
				},
			},
			item: &itemPlatform.Item{
				ID:         itemID,
				StatusID:   operations.Pointer[int64](itemPlatformBrief.STATUSES_REJECTED),
				CategoryID: &newCategoryID,
				Params:     params,
			},
			rejectionInfoGetterMock: func(m *MockRejectionInfoGetterInterface) {
				m.EXPECT().Get(gomock.Any(), rejectionInfoGetter.RejectionInfoRequest{
					Item: rejectionInfoGetter.RejectionInfoRequestItem{
						ID:         itemID,
						CategoryID: newCategoryID,
						Params:     params,
					},
					InfomodelVersion: "test_branch",
					Tree:             "test_tree",
				}).Return(rejectionInfoGetter.RejectionInfo{
					SimpleReasons: map[int64]rejectionInfoGetter.SimpleRejectionReason{
						moderation.ReasonIDWrongCategory: {},
					},
				}, nil)
			},
			userLimitsMock: func(u *MockUserLimits) {},
			vasMock:        func(v *MockVas) {},

			expectedResult: true,
			expectedErr:    nil,
		},
		{
			name:          "item_rejected_by_param",
			newCategoryID: newCategoryID,
			navigation: components.Navigation{
				Config: &components.NavigationConfig{
					Tree:   operations.Pointer("test_tree"),
					Branch: operations.Pointer("test_branch"),
				},
			},
			item: &itemPlatform.Item{
				ID:         itemID,
				StatusID:   operations.Pointer[int64](itemPlatformBrief.STATUSES_REJECTED),
				CategoryID: &newCategoryID,
				Params:     params,
			},
			rejectionInfoGetterMock: func(m *MockRejectionInfoGetterInterface) {
				m.EXPECT().Get(gomock.Any(), rejectionInfoGetter.RejectionInfoRequest{
					Item: rejectionInfoGetter.RejectionInfoRequestItem{
						ID:         itemID,
						CategoryID: newCategoryID,
						Params:     params,
					},
					InfomodelVersion: "test_branch",
					Tree:             "test_tree",
				}).Return(rejectionInfoGetter.RejectionInfo{
					SimpleReasons: map[int64]rejectionInfoGetter.SimpleRejectionReason{
						321: {},
					},
					WrongParamReasons: []rejectionInfoGetter.WrongParamRejectionReason{
						{
							Param: rejectionInfoGetter.Param{},
						},
						{
							Param: rejectionInfoGetter.Param{
								NavigationNodeData: &rejectionInfoGetter.NavigationNodeData{
									DistanceToItemNode: 123,
								},
							},
						},
					},
				}, nil)
			},
			userLimitsMock: func(u *MockUserLimits) {},
			vasMock:        func(v *MockVas) {},

			expectedResult: true,
			expectedErr:    nil,
		},
		{
			name:          "user_limits_error",
			newCategoryID: newCategoryID,
			navigation: components.Navigation{
				Config: &components.NavigationConfig{
					Tree:   operations.Pointer("test_tree"),
					Branch: operations.Pointer("test_branch"),
				},
			},
			item: &itemPlatform.Item{
				ID:         itemID,
				StatusID:   operations.Pointer[int64](itemPlatformBrief.STATUSES_REJECTED),
				CategoryID: &newCategoryID,
				Params:     params,
			},
			rejectionInfoGetterMock: func(m *MockRejectionInfoGetterInterface) {
				m.EXPECT().Get(gomock.Any(), rejectionInfoGetter.RejectionInfoRequest{
					Item: rejectionInfoGetter.RejectionInfoRequestItem{
						ID:         itemID,
						CategoryID: newCategoryID,
						Params:     params,
					},
					InfomodelVersion: "test_branch",
					Tree:             "test_tree",
				}).Return(rejectionInfoGetter.RejectionInfo{}, nil)
			},
			userLimitsMock: func(u *MockUserLimits) {
				u.EXPECT().GetFeeLastPublication(gomock.Any(), itemID).Return(nil, userLimits.ErrFeeDefault)
			},
			vasMock: func(v *MockVas) {
				v.EXPECT().GetActiveVas(gomock.Any(), itemID, true).Return(nil, nil)
			},

			expectedResult: false,
			expectedErr:    userLimits.ErrFeeDefault,
		},
		{
			name:          "vas_error",
			newCategoryID: newCategoryID,
			navigation: components.Navigation{
				Config: &components.NavigationConfig{
					Tree:   operations.Pointer("test_tree"),
					Branch: operations.Pointer("test_branch"),
				},
			},
			item: &itemPlatform.Item{
				ID:         itemID,
				StatusID:   operations.Pointer[int64](itemPlatformBrief.STATUSES_REJECTED),
				CategoryID: &newCategoryID,
				Params:     params,
			},
			rejectionInfoGetterMock: func(m *MockRejectionInfoGetterInterface) {
				m.EXPECT().Get(gomock.Any(), rejectionInfoGetter.RejectionInfoRequest{
					Item: rejectionInfoGetter.RejectionInfoRequestItem{
						ID:         itemID,
						CategoryID: newCategoryID,
						Params:     params,
					},
					InfomodelVersion: "test_branch",
					Tree:             "test_tree",
				}).Return(rejectionInfoGetter.RejectionInfo{}, nil)
			},
			userLimitsMock: func(u *MockUserLimits) {
				u.EXPECT().GetFeeLastPublication(gomock.Any(), itemID).Return(nil, nil)
			},
			vasMock: func(v *MockVas) {
				v.EXPECT().GetActiveVas(gomock.Any(), itemID, true).Return(nil, vas.ErrVasDefault)
			},

			expectedResult: false,
			expectedErr:    vas.ErrVasDefault,
		},
		{
			name:          "expired_item_without_vas",
			newCategoryID: newCategoryID,
			item: &itemPlatform.Item{
				ID:         itemID,
				StatusID:   operations.Pointer[int64](itemPlatformBrief.STATUSES_EXPIRED),
				CategoryID: &newCategoryID,
			},
			rejectionInfoGetterMock: func(m *MockRejectionInfoGetterInterface) {},
			userLimitsMock:          func(u *MockUserLimits) {},
			vasMock: func(v *MockVas) {
				v.EXPECT().GetActiveVas(gomock.Any(), itemID, true).Return(nil, nil)
			},

			expectedResult: true,
			expectedErr:    nil,
		},
		{
			name:          "expired_item_with_vas",
			newCategoryID: newCategoryID,
			item: &itemPlatform.Item{
				ID:         itemID,
				StatusID:   operations.Pointer[int64](itemPlatformBrief.STATUSES_EXPIRED),
				CategoryID: &newCategoryID,
			},
			rejectionInfoGetterMock: func(m *MockRejectionInfoGetterInterface) {},
			userLimitsMock: func(u *MockUserLimits) {
			},
			vasMock: func(v *MockVas) {
				v.EXPECT().GetActiveVas(gomock.Any(), gomock.Any(), gomock.Any()).Return(&vas.Active{
					HasActive: true,
				}, nil)
			},

			expectedResult: false,
			expectedErr:    nil,
		},
		{
			name:          "paid_active_item",
			newCategoryID: newCategoryID,
			navigation: components.Navigation{
				Config: &components.NavigationConfig{
					Tree:   operations.Pointer("test_tree"),
					Branch: operations.Pointer("test_branch"),
				},
			},
			item: &itemPlatform.Item{
				ID:         itemID,
				StatusID:   operations.Pointer[int64](itemPlatformBrief.STATUSES_ACTIVATED),
				CategoryID: &newCategoryID,
				Params:     params,
			},
			rejectionInfoGetterMock: func(m *MockRejectionInfoGetterInterface) {},
			userLimitsMock: func(u *MockUserLimits) {
				u.EXPECT().GetFeeLastPublication(gomock.Any(), gomock.Any()).
					Return(&userLimits.FeeInfo{IsPaid: true}, nil)
			},
			vasMock: func(v *MockVas) {
				v.EXPECT().GetActiveVas(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)
			},

			expectedResult: false,
			expectedErr:    nil,
		},
		{
			name:          "item_title_cleared",
			newCategoryID: category.TransportParts,
			item: &itemPlatform.Item{
				ID:         itemID,
				StatusID:   operations.Pointer[int64](itemPlatformBrief.STATUSES_CLOSED),
				CategoryID: operations.Pointer[int64](category.TransportCars),
				Title:      operations.Pointer("test_title"),
			},
			rejectionInfoGetterMock: func(m *MockRejectionInfoGetterInterface) {},
			userLimitsMock: func(u *MockUserLimits) {
				u.EXPECT().GetFeeLastPublication(gomock.Any(), gomock.Any()).Return(nil, nil)
			},
			vasMock: func(v *MockVas) {
				v.EXPECT().GetActiveVas(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)
			},

			expectedResult: true,
			expectedErr:    nil,
			assertItem: func(t *testing.T, item *itemPlatform.Item) {
				assert.NotNil(t, item)
				assert.Nil(t, item.Title)
			},
		},
	}

	rejectionInfoGetterMock := NewMockRejectionInfoGetterInterface(ctrl)
	userLimitsMock := NewMockUserLimits(ctrl)
	vasMock := NewMockVas(ctrl)
	metricsMock := NewMockMetrics(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
	catalogsMock := NewMockCatalogs(ctrl)

	log, _ := logger.New(logger.WithEnabled(false))
	for _, tc := range testData {
		t.Run(tc.name, func(t *testing.T) {
			tc.rejectionInfoGetterMock(rejectionInfoGetterMock)
			tc.userLimitsMock(userLimitsMock)
			tc.vasMock(vasMock)

			dictsParams := New(
				log,
				NewMockDraftHashVerifier(ctrl),
				NewMockSessionIDGenerator(ctrl),
				NewMockDraftStorage(ctrl),
				NewMockUserProfile(ctrl),
				NewMockAccountsHierarchy(ctrl),
				NewMockNavigationManager(ctrl),
				NewMockEventSender(ctrl),
				NewMockSellerAddressesClient(ctrl),
				NewMockAddressBookClient(ctrl),
				NewMockTariffAggregator(ctrl),
				NewMockComposition(ctrl),
				NewMockFormManager(ctrl),
				NewMockPublishItemActions(ctrl),
				NewMockCoreGeo(ctrl),
				userLimitsMock,
				vasMock,
				NewMockParamsProcessor(ctrl),
				NewMockGorelkin(ctrl),
				NewMockGeoResolver(ctrl),
				NewMockItemPlatformClient(ctrl),
				NewMockItemPlatformExpander(ctrl),
				NewMockProfileCoreInstance(ctrl),
				NewMockTogglesManager(ctrl),
				healthMetrics,
				rejectionInfoGetterMock,
				catalogsMock,
			)

			editCategoryFlag, err := dictsParams.getEditCategoryFlag(
				context.Background(),
				tc.newCategoryID,
				tc.navigation,
				tc.item,
			)

			assert.Equal(t, tc.expectedResult, editCategoryFlag, tc.name)
			if tc.expectedErr != nil {
				assert.ErrorIs(t, err, tc.expectedErr)
			} else {
				assert.NoError(t, err)
			}

			if tc.assertItem != nil {
				tc.assertItem(t, tc.item)
			}
		})
	}
}

func TestDictsParameters_GetPhotoUploadFlag(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	metricsMock := NewMockMetrics(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
	catalogsMock := NewMockCatalogs(ctrl)

	log, _ := logger.New(logger.WithEnabled(false))
	dictsParams := New(
		log,
		NewMockDraftHashVerifier(ctrl),
		NewMockSessionIDGenerator(ctrl),
		NewMockDraftStorage(ctrl),
		NewMockUserProfile(ctrl),
		NewMockAccountsHierarchy(ctrl),
		NewMockNavigationManager(ctrl),
		NewMockEventSender(ctrl),
		NewMockSellerAddressesClient(ctrl),
		NewMockAddressBookClient(ctrl),
		NewMockTariffAggregator(ctrl),
		NewMockComposition(ctrl),
		NewMockFormManager(ctrl),
		NewMockPublishItemActions(ctrl),
		NewMockCoreGeo(ctrl),
		NewMockUserLimits(ctrl),
		NewMockVas(ctrl),
		NewMockParamsProcessor(ctrl),
		NewMockGorelkin(ctrl),
		NewMockGeoResolver(ctrl),
		NewMockItemPlatformClient(ctrl),
		NewMockItemPlatformExpander(ctrl),
		NewMockProfileCoreInstance(ctrl),
		NewMockTogglesManager(ctrl),
		healthMetrics,
		NewMockRejectionInfoGetterInterface(ctrl),
		catalogsMock,
	)

	flag, err := dictsParams.getPhotoUploadFlag(context.Background(), 123123123123, nil, nil)

	assert.NoError(t, err)
	assert.False(t, flag)
}

func TestDictsParameters_GetEditCategorySlot(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	errTest := errors.New("test error")

	testData := []struct {
		name       string
		node       infomodel.NavigationsNode
		data       Data
		categoryID int64
		navMock    func(n *MockNavigationManager)
		slot       *slot.Slot
		err        error
	}{
		{
			name: "error get model",
			node: infomodel.NavigationsNode{
				Name:     "test",
				ParentId: nil,
			},
			data: Data{
				UserData: components.DictsParametersRequestForm{
					Navigation: components.Navigation{
						Config: &components.NavigationConfig{
							Tree:   operations.Pointer("tree"),
							Branch: operations.Pointer("branch"),
						},
					},
				},
			},
			categoryID: int64(category.AnimalsAqua),
			navMock: func(n *MockNavigationManager) {
				n.EXPECT().GetCategoryByID(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, errTest)
			},
			slot: nil,
			err:  errTest,
		},
		{
			name: "get model",
			node: infomodel.NavigationsNode{
				Name:     "node name",
				ParentId: nil,
			},
			data: Data{
				UserData: components.DictsParametersRequestForm{
					Navigation: components.Navigation{
						Config: &components.NavigationConfig{
							Tree:   operations.Pointer("tree"),
							Branch: operations.Pointer("branch"),
						},
					},
				},
			},
			categoryID: int64(category.AnimalsAqua),
			navMock: func(n *MockNavigationManager) {
				n.EXPECT().GetCategoryByID(gomock.Any(), gomock.Any(), gomock.Any()).
					Return(
						&infomodelModel.Category{
							Name: "category name",
						}, nil)
			},
			slot: &slot.Slot{
				ID:    editCategorySlot.SlotID,
				Label: "Категория объявления",
				Widget: &slot.SlotWidget{
					Type: editCategorySlot.SlotWidgetType,
					Config: map[string]interface{}{
						"field": map[string]interface{}{
							"id":          editCategorySlot.SlotWidgetType,
							"type":        editCategorySlot.SlotWidgetType,
							"title":       "node name",
							"parentTitle": "",
							"categoryId":  float64(category.AnimalsAqua),
						},
					},
				},
				Motivation: &slot.AttributedText{},
			},
			err: nil,
		},
	}

	navMock := NewMockNavigationManager(ctrl)
	metricsMock := NewMockMetrics(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
	catalogsMock := NewMockCatalogs(ctrl)

	log, _ := logger.New(logger.WithEnabled(false))
	for _, testCase := range testData {
		t.Run(testCase.name, func(t *testing.T) {
			testCase.navMock(navMock)

			dictsParams := New(
				log,
				NewMockDraftHashVerifier(ctrl),
				NewMockSessionIDGenerator(ctrl),
				NewMockDraftStorage(ctrl),
				NewMockUserProfile(ctrl),
				NewMockAccountsHierarchy(ctrl),
				navMock,
				NewMockEventSender(ctrl),
				NewMockSellerAddressesClient(ctrl),
				NewMockAddressBookClient(ctrl),
				NewMockTariffAggregator(ctrl),
				NewMockComposition(ctrl),
				NewMockFormManager(ctrl),
				NewMockPublishItemActions(ctrl),
				NewMockCoreGeo(ctrl),
				NewMockUserLimits(ctrl),
				NewMockVas(ctrl),
				NewMockParamsProcessor(ctrl),
				NewMockGorelkin(ctrl),
				NewMockGeoResolver(ctrl),
				NewMockItemPlatformClient(ctrl),
				NewMockItemPlatformExpander(ctrl),
				NewMockProfileCoreInstance(ctrl),
				NewMockTogglesManager(ctrl),
				healthMetrics,
				NewMockRejectionInfoGetterInterface(ctrl),
				catalogsMock,
			)

			edCategorySlot, err := dictsParams.getEditCategorySlot(
				context.Background(),
				testCase.node,
				testCase.data,
				testCase.categoryID,
			)

			assert.Equal(t, testCase.slot, edCategorySlot, testCase.name)
			assert.Equal(t, testCase.err, err, testCase.name)
		})
	}
}

func TestDictsParameters_ClearGeoData(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	metricsMock := NewMockMetrics(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
	catalogsMock := NewMockCatalogs(ctrl)

	log, _ := logger.New(logger.WithEnabled(false))
	dictsParams := New(
		log,
		NewMockDraftHashVerifier(ctrl),
		NewMockSessionIDGenerator(ctrl),
		NewMockDraftStorage(ctrl),
		NewMockUserProfile(ctrl),
		NewMockAccountsHierarchy(ctrl),
		NewMockNavigationManager(ctrl),
		NewMockEventSender(ctrl),
		NewMockSellerAddressesClient(ctrl),
		NewMockAddressBookClient(ctrl),
		NewMockTariffAggregator(ctrl),
		NewMockComposition(ctrl),
		NewMockFormManager(ctrl),
		NewMockPublishItemActions(ctrl),
		NewMockCoreGeo(ctrl),
		NewMockUserLimits(ctrl),
		NewMockVas(ctrl),
		NewMockParamsProcessor(ctrl),
		NewMockGorelkin(ctrl),
		NewMockGeoResolver(ctrl),
		NewMockItemPlatformClient(ctrl),
		NewMockItemPlatformExpander(ctrl),
		NewMockProfileCoreInstance(ctrl),
		NewMockTogglesManager(ctrl),
		healthMetrics,
		NewMockRejectionInfoGetterInterface(ctrl),
		catalogsMock,
	)

	item := itemPlatform.Item{
		MetroID:    operations.Pointer[int64](123),
		RoadID:     operations.Pointer[int64](456),
		DistrictID: operations.Pointer[int64](678),
		Params: map[string]interface{}{
			strconv.Itoa(avito.IdentifikatoryAdresov110064): 123123,
		},
		Mu: &sync.RWMutex{},
	}

	dictsParams.clearGeoData(&item)

	assert.Empty(t, item.MetroID)
	assert.Empty(t, item.RoadID)
	assert.Empty(t, item.DistrictID)
	assert.Empty(t, item.Params[strconv.Itoa(avito.IdentifikatoryAdresov110064)])
}

func TestParams_getCatalogUID(t *testing.T) {
	testcases := []struct {
		name   string
		params map[int64]interface{}
		assert func(t *testing.T, res string)
	}{
		{
			name: "sucess find",
			params: map[int64]interface{}{
				123:                    "123",
				avito.CatalogUid110839: "123456",
				456:                    "456",
			},
			assert: func(t *testing.T, res string) {
				assert.Equal(t, "123456", res)
			},
		},
		{
			name: "no value to find",
			params: map[int64]interface{}{
				123: "123",
			},
			assert: func(t *testing.T, res string) {
				assert.Equal(t, "", res)
			},
		},
	}

	for _, tc := range testcases {
		t.Run(tc.name, func(t *testing.T) {
			tc.assert(t, getCatalogUID(tc.params))
		})
	}
}

func TestDictsParameters_Process_UserNotOwner(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	userID := int64(123)
	itemID := int64(890)
	params := map[string]interface{}{
		"7":               10,
		"8":               11,
		"[{\"1\":12345}]": "[{\"1\":12345}]",
		strconv.Itoa(avito.IdentifikatoryAdresov110064): 123,
		fmt.Sprint(avito.CatalogUid110839):              "1234567999",
	}

	data := Data{
		UserID: userID,
		UserData: components.DictsParametersRequestForm{
			ItemId: operations.Pointer[int64](itemID),
			Navigation: components.Navigation{
				CategoryId: operations.Pointer[int64](int64(category.AnimalsAqua)),
				Group:      operations.Pointer("group"),
				Attributes: []components.NavigationAttributesItem{
					{
						Id:    int64(1),
						Value: int64(4),
					},
					{
						Id:    int64(2),
						Value: int64(5),
					},
				},
				Config: &components.NavigationConfig{
					Branch: operations.Pointer("branch"),
					Tree:   operations.Pointer("tree"),
					Layout: operations.Pointer(resolving.PlatformAndroidEditLayout),
				},
			},
			Params: map[string]interface{}{},
		},
		Platform: resolving.PlatformMAV,
	}

	userProfileMock := NewMockUserProfile(ctrl)
	userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
		Return(
			&userProfile.User{
				ID:        int64(123123),
				IsCompany: operations.Pointer(true),
			}, nil)
	tariffAggregatorMock := NewMockTariffAggregator(ctrl)
	tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).Return(false, nil)

	itemPlatformMock := NewMockItemPlatformClient(ctrl)
	itemPlatformMock.EXPECT().GetByID(gomock.Any(), gomock.Eq(itemID), gomock.Eq(itemPlatform.ParamCollectionPublish)).
		Return(
			&itemPlatform.Item{
				ID:         itemID,
				StatusID:   operations.Pointer[int64](itemPlatformBrief.STATUSES_EXPIRED),
				UserID:     operations.Pointer[int64](123),
				CategoryID: operations.Pointer[int64](category.RealEstateFlats),
				LocationID: operations.Pointer[int64](int64(location.MoscowRegion)),
				Params:     params,
			}, nil)
	itemPlatformExpanderMock := NewMockItemPlatformExpander(ctrl)

	profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
	compositionMock := NewMockComposition(ctrl)
	compositionMock.EXPECT().
		GetInfomodelVersion(gomock.Any(), gomock.Any()).
		Return(infomodelClient.LatestVersion).
		AnyTimes()
	frMock := NewMockFeatureRegistry(ctrl)
	frMock.EXPECT().Check(gomock.Any()).Return(false).Times(2)
	compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)

	navigationManagerMock := NewMockNavigationManager(ctrl)
	metricsMock := NewMockMetrics(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
	metricsMock.
		EXPECT().
		TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		AnyTimes()
	catalogsMock := NewMockCatalogs(ctrl)

	log, _ := logger.New(logger.WithEnabled(false))
	dictsParams := New(
		log,
		NewMockDraftHashVerifier(ctrl),
		NewMockSessionIDGenerator(ctrl),
		NewMockDraftStorage(ctrl),
		userProfileMock,
		NewMockAccountsHierarchy(ctrl),
		navigationManagerMock,
		NewMockEventSender(ctrl),
		NewMockSellerAddressesClient(ctrl),
		NewMockAddressBookClient(ctrl),
		tariffAggregatorMock,
		compositionMock,
		NewMockFormManager(ctrl),
		NewMockPublishItemActions(ctrl),
		NewMockCoreGeo(ctrl),
		NewMockUserLimits(ctrl),
		NewMockVas(ctrl),
		NewMockParamsProcessor(ctrl),
		NewMockGorelkin(ctrl),
		NewMockGeoResolver(ctrl),
		itemPlatformMock,
		itemPlatformExpanderMock,
		profileCoreInstanceMock,
		NewMockTogglesManager(ctrl),
		healthMetrics,
		NewMockRejectionInfoGetterInterface(ctrl),
		catalogsMock,
	)
	_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

	assert.Error(t, err)
	assert.Equal(t, friendlyError.ErrUserNotOwner(nil), err)
}

func TestDictsParameters_Process_EmployeeError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	userID := int64(123)

	testError := errors.New("test error")

	data := Data{
		UserID: userID,
		UserData: components.DictsParametersRequestForm{
			Navigation: components.Navigation{
				CategoryId: operations.Pointer[int64](int64(category.AnimalsAqua)),
				Group:      operations.Pointer("group"),
				Attributes: []components.NavigationAttributesItem{
					{
						Id:    int64(1),
						Value: int64(4),
					},
					{
						Id:    int64(2),
						Value: int64(5),
					},
				},
				Config: &components.NavigationConfig{
					Branch: operations.Pointer("branch"),
					Tree:   operations.Pointer("tree"),
					Layout: operations.Pointer(resolving.PlatformAndroidCreationLayout),
				},
			},
			Params: map[string]interface{}{
				"1":               12,
				"3":               6,
				"[{\"1\":12345}]": "[{\"1\":12345}]",
			},
			IsEmployee:       operations.Pointer(true),
			PublishSessionId: operations.Pointer("sessionId"),
		},
		Platform: resolving.PlatformMAV,
	}

	userProfileMock := NewMockUserProfile(ctrl)
	userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
		Return(
			&userProfile.User{
				ID:        int64(123123),
				IsCompany: operations.Pointer(true),
			}, nil)
	accountsHierarchyMock := NewMockAccountsHierarchy(ctrl)
	accountsHierarchyMock.EXPECT().GetEmployeeByID(gomock.Any(), gomock.Any()).Return(nil, testError)
	tariffAggregatorMock := NewMockTariffAggregator(ctrl)
	itemPlatformMock := NewMockItemPlatformClient(ctrl)
	itemPlatformExpanderMock := NewMockItemPlatformExpander(ctrl)
	compositionMock := NewMockComposition(ctrl)
	compositionMock.EXPECT().
		GetInfomodelVersion(gomock.Any(), gomock.Any()).
		Return(infomodelClient.LatestVersion).
		AnyTimes()
	frMock := NewMockFeatureRegistry(ctrl)
	frMock.EXPECT().Check(gomock.Any()).Return(false).Times(1)
	compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)

	profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
	metricsMock := NewMockMetrics(ctrl)
	hybridCacheMock := NewMockHybridCache(ctrl)
	hybridCacheMock.EXPECT().Get(gomock.Any()).Return(nil, false).Times(1)
	hybridCacheMock.EXPECT().Put(gomock.Any(), gomock.Any()).Times(1)
	healthMetrics := NewPublishHealthMetrics(metricsMock, hybridCacheMock)
	metricsMock.
		EXPECT().
		TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		AnyTimes()
	navigationManagerMock := NewMockNavigationManager(ctrl)
	catalogsMock := NewMockCatalogs(ctrl)

	log, _ := logger.New(logger.WithEnabled(false))
	dictsParams := New(
		log,
		NewMockDraftHashVerifier(ctrl),
		NewMockSessionIDGenerator(ctrl),
		NewMockDraftStorage(ctrl),
		userProfileMock,
		accountsHierarchyMock,
		navigationManagerMock,
		NewMockEventSender(ctrl),
		NewMockSellerAddressesClient(ctrl),
		NewMockAddressBookClient(ctrl),
		tariffAggregatorMock,
		compositionMock,
		NewMockFormManager(ctrl),
		NewMockPublishItemActions(ctrl),
		NewMockCoreGeo(ctrl),
		NewMockUserLimits(ctrl),
		NewMockVas(ctrl),
		NewMockParamsProcessor(ctrl),
		NewMockGorelkin(ctrl),
		NewMockGeoResolver(ctrl),
		itemPlatformMock,
		itemPlatformExpanderMock,
		profileCoreInstanceMock,
		NewMockTogglesManager(ctrl),
		healthMetrics,
		NewMockRejectionInfoGetterInterface(ctrl),
		catalogsMock,
	)
	_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

	assert.Error(t, err)
	assert.Equal(t, testError, err)
}

func TestDictsParameters_Process_EmptyConfigNavigation(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	userID := int64(123)
	data := Data{
		UserID: userID,
		UserData: components.DictsParametersRequestForm{
			Navigation: components.Navigation{
				CategoryId: operations.Pointer[int64](int64(category.AnimalsAqua)),
				Group:      operations.Pointer("group"),
				Attributes: make([]components.NavigationAttributesItem, 0),
			},
		},
		Platform: "sdfsdfsdfsd",
	}

	userProfileMock := NewMockUserProfile(ctrl)
	userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
		Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil)
	tariffAggregatorMock := NewMockTariffAggregator(ctrl)
	tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).Return(false, nil)

	mockNavigationManager := NewMockNavigationManager(ctrl)
	mockNavigationManager.EXPECT().ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)

	compositionMock := NewMockComposition(ctrl)
	frMock := NewMockFeatureRegistry(ctrl)
	frMock.EXPECT().Check(gomock.Any()).Return(false).AnyTimes()
	compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)

	profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
	metricsMock := NewMockMetrics(ctrl)
	hybridCacheMock := NewMockHybridCache(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, hybridCacheMock)
	metricsMock.
		EXPECT().
		TrackPublishHealth(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		AnyTimes()
	catalogsMock := NewMockCatalogs(ctrl)

	log, _ := logger.New(logger.WithEnabled(false))
	dictsParams := New(
		log,
		NewMockDraftHashVerifier(ctrl),
		NewMockSessionIDGenerator(ctrl),
		NewMockDraftStorage(ctrl),
		userProfileMock,
		NewMockAccountsHierarchy(ctrl),
		mockNavigationManager,
		NewMockEventSender(ctrl),
		NewMockSellerAddressesClient(ctrl),
		NewMockAddressBookClient(ctrl),
		tariffAggregatorMock,
		compositionMock,
		NewMockFormManager(ctrl),
		NewMockPublishItemActions(ctrl),
		NewMockCoreGeo(ctrl),
		NewMockUserLimits(ctrl),
		NewMockVas(ctrl),
		NewMockParamsProcessor(ctrl),
		NewMockGorelkin(ctrl),
		NewMockGeoResolver(ctrl),
		NewMockItemPlatformClient(ctrl),
		NewMockItemPlatformExpander(ctrl),
		profileCoreInstanceMock,
		NewMockTogglesManager(ctrl),
		healthMetrics,
		NewMockRejectionInfoGetterInterface(ctrl),
		catalogsMock,
	)
	_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

	assert.Error(t, err)
	assert.Equal(t, friendlyError.ErrNodeNavigationNotFound(nil), err)
}

func TestDictsParameters_Process_EmptyCategoryId(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	userID := int64(123)
	data := Data{
		UserID: userID,
		UserData: components.DictsParametersRequestForm{
			Navigation: components.Navigation{
				CategoryId: operations.Pointer[int64](int64(category.AnimalsAqua)),
				Group:      operations.Pointer("group"),
				Attributes: make([]components.NavigationAttributesItem, 0),
				Config: &components.NavigationConfig{
					Branch: operations.Pointer("test"),
					Tree:   operations.Pointer("tree"),
				},
			},
			DraftId: operations.Pointer[int64](123),
		},
		Platform: resolving.PlatformMAV,
	}

	userProfileMock := NewMockUserProfile(ctrl)
	userProfileMock.EXPECT().V1UserGetByID(gomock.Any(), gomock.Any()).
		Return(&userProfile.User{IsCompany: operations.Pointer(true)}, nil)
	tariffAggregatorMock := NewMockTariffAggregator(ctrl)
	tariffAggregatorMock.EXPECT().HasActiveFeature(gomock.Any(), gomock.Any(), gomock.Any()).Return(false, nil)

	draftStorageMock := NewMockDraftStorage(ctrl)
	draftStorageMock.EXPECT().Get(gomock.Any(), gomock.Any()).
		Return(
			&draftStorage.Draft{
				UserID:     &userID,
				Available:  true,
				SessionID:  "123123",
				Attributes: &[]draftStorage.Attribute{},
			}, nil)

	navigationManagerMock := NewMockNavigationManager(ctrl)
	navigationManagerMock.
		EXPECT().
		ExpandNavigationWithDraft(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(navigationManager.ErrCategoryNotFound)
	navigationManagerMock.EXPECT().FindNodeByAttributes(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(nil, fmt.Errorf("not found")).AnyTimes()

	profileCoreInstanceMock := NewMockProfileCoreInstance(ctrl)
	profileCoreInstanceMock.EXPECT().GetProfessionalInfo(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)

	compositionMock := NewMockComposition(ctrl)
	compositionMock.EXPECT().
		GetInfomodelVersion(gomock.Any(), gomock.Any()).
		Return(infomodelClient.LatestVersion).
		AnyTimes()
	frMock := NewMockFeatureRegistry(ctrl)
	frMock.EXPECT().Check(gomock.Any()).Return(false).AnyTimes()
	compositionMock.EXPECT().GetFeatureRegistry(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(1).Return(frMock)

	metricsMock := NewMockMetrics(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))

	togglesMock := NewMockTogglesManager(ctrl)
	catalogsMock := NewMockCatalogs(ctrl)

	log, _ := logger.New(logger.WithEnabled(false))
	dictsParams := New(
		log,
		NewMockDraftHashVerifier(ctrl),
		NewMockSessionIDGenerator(ctrl),
		draftStorageMock,
		userProfileMock,
		NewMockAccountsHierarchy(ctrl),
		navigationManagerMock,
		NewMockEventSender(ctrl),
		NewMockSellerAddressesClient(ctrl),
		NewMockAddressBookClient(ctrl),
		tariffAggregatorMock,
		compositionMock,
		NewMockFormManager(ctrl),
		NewMockPublishItemActions(ctrl),
		NewMockCoreGeo(ctrl),
		NewMockUserLimits(ctrl),
		NewMockVas(ctrl),
		NewMockParamsProcessor(ctrl),
		NewMockGorelkin(ctrl),
		NewMockGeoResolver(ctrl),
		NewMockItemPlatformClient(ctrl),
		NewMockItemPlatformExpander(ctrl),
		profileCoreInstanceMock,
		togglesMock,
		healthMetrics,
		NewMockRejectionInfoGetterInterface(ctrl),
		catalogsMock,
	)
	_, err := dictsParams.Process(context.Background(), data, dictsParameters.Specifications{})

	assert.Error(t, err)
	assert.Equal(t, friendlyError.ErrCategoryNotFound(nil), err)
}

func TestDictsParameters_GetSlots(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	testData := []struct {
		name                   string
		data                   Data
		draft                  *draftStorage.Draft
		params                 map[int64]interface{}
		publishItemActionsMock func(p *MockPublishItemActions)
		slots                  []slot.Slot
		err                    error
	}{
		{
			name: "empty data",
			data: Data{
				UserID: int64(123),
				UserData: components.DictsParametersRequestForm{
					Navigation: components.Navigation{
						Config: &components.NavigationConfig{
							Layout: operations.Pointer(""),
							Branch: operations.Pointer(""),
						},
					},
				},
			},
			draft:  nil,
			params: nil,
			publishItemActionsMock: func(p *MockPublishItemActions) {
				p.EXPECT().GetSlots(
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
				).Return(nil, nil)
			},
			slots: nil,
			err:   nil,
		},
		{
			name: "merge draft data and params",
			data: Data{
				UserID: int64(123),
				UserData: components.DictsParametersRequestForm{
					Navigation: components.Navigation{
						Config: &components.NavigationConfig{
							Layout: operations.Pointer(""),
							Branch: operations.Pointer(""),
						},
					},
					Slots: map[string]interface{}{
						"100": map[string]interface{}{"slot100": "value100"},
						"200": map[string]interface{}{"slot200": "value200"},
					},
				},
			},
			draft: &draftStorage.Draft{
				Slots: &[]draftStorage.Slot{
					{
						ID:    int64(1),
						Value: map[string]interface{}{"slot1": "value1"},
					},
					{
						ID:    int64(2),
						Value: map[string]interface{}{"slot2": "value2"},
					},
				},
			},
			params: map[int64]interface{}{
				3: 300,
				4: 400,
			},
			publishItemActionsMock: func(p *MockPublishItemActions) {
				p.EXPECT().GetSlots(
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					mapMatcherData(
						map[string]interface{}{
							"3": 300,
							"4": 400,
						},
					),
					mapMatcherData(
						map[string]interface{}{
							"1":   map[string]interface{}{"slot1": "value1"},
							"2":   map[string]interface{}{"slot2": "value2"},
							"100": map[string]interface{}{"slot100": "value100"},
							"200": map[string]interface{}{"slot200": "value200"},
						},
					),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
					gomock.Any(),
				).Return(nil, nil)
			},
			slots: nil,
			err:   nil,
		},
	}

	publishItemActionsMock := NewMockPublishItemActions(ctrl)
	metricsMock := NewMockMetrics(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
	catalogsMock := NewMockCatalogs(ctrl)

	log, _ := logger.New(logger.WithEnabled(false))
	for _, testCase := range testData {
		t.Run(testCase.name, func(t *testing.T) {
			testCase.publishItemActionsMock(publishItemActionsMock)

			dictsParams := New(
				log,
				NewMockDraftHashVerifier(ctrl),
				NewMockSessionIDGenerator(ctrl),
				NewMockDraftStorage(ctrl),
				NewMockUserProfile(ctrl),
				NewMockAccountsHierarchy(ctrl),
				NewMockNavigationManager(ctrl),
				NewMockEventSender(ctrl),
				NewMockSellerAddressesClient(ctrl),
				NewMockAddressBookClient(ctrl),
				NewMockTariffAggregator(ctrl),
				NewMockComposition(ctrl),
				NewMockFormManager(ctrl),
				publishItemActionsMock,
				NewMockCoreGeo(ctrl),
				NewMockUserLimits(ctrl),
				NewMockVas(ctrl),
				NewMockParamsProcessor(ctrl),
				NewMockGorelkin(ctrl),
				NewMockGeoResolver(ctrl),
				NewMockItemPlatformClient(ctrl),
				NewMockItemPlatformExpander(ctrl),
				NewMockProfileCoreInstance(ctrl),
				NewMockTogglesManager(ctrl),
				healthMetrics,
				NewMockRejectionInfoGetterInterface(ctrl),
				catalogsMock,
			)
			slots, err := dictsParams.getSlots(
				context.Background(),
				testCase.data,
				testCase.draft,
				dictsParameters.Specifications{},
				0,
				testCase.params,
			)

			assert.Equal(t, testCase.slots, slots)
			assert.Equal(t, testCase.err, err)
		})
	}
}

func TestGetProcessData_Positive(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	itemID := int64(12)
	userID := int64(123)
	passportID := int64(1234)
	draftID := int64(12345)
	companyID := int64(123456)
	verticalID := int64(1234567)

	user := userProfile.User{ID: userID}
	item := itemPlatform.Item{ID: itemID}
	employee := accountsHierarchy.Employee{
		ID:             0,
		AvitoUserID:    userID,
		AvitoCompanyID: companyID,
		Status:         "",
	}
	draft := draftStorage.Draft{ID: draftID, UserID: &userID, Available: true}

	tt := []struct {
		name                      string
		userID                    int64
		passportID                *int64
		draftID                   *int64
		data                      Data
		getSessionIDGeneratorMock func() *MockSessionIDGenerator
		getDraftStorageMock       func() *MockDraftStorage
		getTariffAggregatorMock   func() *MockTariffAggregator
		getAccountsHierarchyMock  func() *MockAccountsHierarchy
		getProfileCoreMock        func() *MockProfileCoreInstance
		getUserProfileMock        func() *MockUserProfile
		getItemPlatformMock       func() *MockItemPlatformClient

		expectedResult dictsParameters.ProcessData
	}{
		{
			name:       "employee_with_draft",
			userID:     userID,
			passportID: &passportID,
			draftID:    &draftID,
			data: Data{
				UserID:     userID,
				PassportID: &passportID,
				DeviceID:   "",
				UserData: components.DictsParametersRequestForm{
					ItemId:     &itemID,
					DraftId:    &draftID,
					IsEmployee: operations.Pointer(true),
				},
			},

			getDraftStorageMock: func() *MockDraftStorage {
				mock := NewMockDraftStorage(ctrl)

				mock.EXPECT().Get(gomock.Any(), draftID).Return(&draft, nil)

				return mock
			},
			getAccountsHierarchyMock: func() *MockAccountsHierarchy {
				mock := NewMockAccountsHierarchy(ctrl)

				mock.EXPECT().GetEmployeeByID(gomock.Any(), userID).Return(&employee, nil)

				return mock
			},
			getTariffAggregatorMock: func() *MockTariffAggregator {
				mock := NewMockTariffAggregator(ctrl)

				mock.EXPECT().HasActiveFeature(gomock.Any(), companyID, dicts.TariffContractWysiwyg).Return(true, nil)

				return mock
			},
			getProfileCoreMock: func() *MockProfileCoreInstance {
				mock := NewMockProfileCoreInstance(ctrl)

				mock.EXPECT().GetProfessionalInfo(gomock.Any(), userID, &passportID).Return(&profileCore.Professional{
					VerticalID: &verticalID,
				}, nil)

				return mock
			},
			getUserProfileMock: func() *MockUserProfile {
				mock := NewMockUserProfile(ctrl)

				mock.EXPECT().V1UserGetByID(gomock.Any(), userID).Return(&user, nil)

				return mock
			},
			getItemPlatformMock: func() *MockItemPlatformClient {
				mock := NewMockItemPlatformClient(ctrl)

				mock.EXPECT().GetByID(gomock.Any(), itemID, gomock.Any()).Return(&item, nil)

				return mock
			},
			getSessionIDGeneratorMock: func() *MockSessionIDGenerator {
				mock := NewMockSessionIDGenerator(ctrl)
				mock.EXPECT().Generate(userID, gomock.Any()).Return("")
				return mock
			},
			expectedResult: dictsParameters.ProcessData{
				IsWysiwyg:         true,
				User:              &user,
				Item:              &item,
				Employee:          &employee,
				Draft:             &draft,
				UserVerticalID:    &verticalID,
				SellerAddressData: &dictsParameters.SellerAddressData{},
			},
		},
		{
			name:   "employee_wo_draft",
			userID: userID,
			data: Data{
				UserID:   userID,
				DeviceID: "",
				UserData: components.DictsParametersRequestForm{
					ItemId:     &itemID,
					IsEmployee: operations.Pointer(true),
				},
			},

			getSessionIDGeneratorMock: func() *MockSessionIDGenerator {
				return NewMockSessionIDGenerator(ctrl)
			},
			getDraftStorageMock: func() *MockDraftStorage {
				return NewMockDraftStorage(ctrl)
			},
			getAccountsHierarchyMock: func() *MockAccountsHierarchy {
				mock := NewMockAccountsHierarchy(ctrl)

				mock.EXPECT().GetEmployeeByID(gomock.Any(), userID).Return(&employee, nil)

				return mock
			},
			getTariffAggregatorMock: func() *MockTariffAggregator {
				mock := NewMockTariffAggregator(ctrl)

				mock.EXPECT().HasActiveFeature(gomock.Any(), companyID, dicts.TariffContractWysiwyg).Return(true, nil)

				return mock
			},
			getProfileCoreMock: func() *MockProfileCoreInstance {
				return NewMockProfileCoreInstance(ctrl)
			},
			getUserProfileMock: func() *MockUserProfile {
				mock := NewMockUserProfile(ctrl)

				mock.EXPECT().V1UserGetByID(gomock.Any(), userID).Return(&user, nil)

				return mock
			},
			getItemPlatformMock: func() *MockItemPlatformClient {
				mock := NewMockItemPlatformClient(ctrl)

				mock.EXPECT().GetByID(gomock.Any(), itemID, gomock.Any()).Return(&item, nil)

				return mock
			},
			expectedResult: dictsParameters.ProcessData{
				IsWysiwyg:         true,
				User:              &user,
				Item:              &item,
				Employee:          &employee,
				Draft:             nil,
				UserVerticalID:    nil,
				SellerAddressData: &dictsParameters.SellerAddressData{},
			},
		},
		{
			name:       "private_with_draft",
			userID:     userID,
			passportID: &passportID,
			draftID:    &draftID,
			data: Data{
				UserID:     userID,
				PassportID: &passportID,
				DeviceID:   "",
				UserData: components.DictsParametersRequestForm{
					ItemId:     &itemID,
					DraftId:    &draftID,
					IsEmployee: operations.Pointer(false),
				},
			},

			getSessionIDGeneratorMock: func() *MockSessionIDGenerator {
				mock := NewMockSessionIDGenerator(ctrl)
				mock.EXPECT().Generate(userID, gomock.Any()).Return("")
				return mock
			},
			getDraftStorageMock: func() *MockDraftStorage {
				mock := NewMockDraftStorage(ctrl)

				mock.EXPECT().Get(gomock.Any(), draftID).Return(&draft, nil)

				return mock
			},
			getAccountsHierarchyMock: func() *MockAccountsHierarchy {
				return NewMockAccountsHierarchy(ctrl)
			},
			getTariffAggregatorMock: func() *MockTariffAggregator {
				mock := NewMockTariffAggregator(ctrl)

				mock.EXPECT().HasActiveFeature(gomock.Any(), userID, dicts.TariffContractWysiwyg).Return(false, nil)

				return mock
			},
			getProfileCoreMock: func() *MockProfileCoreInstance {
				mock := NewMockProfileCoreInstance(ctrl)

				mock.EXPECT().GetProfessionalInfo(gomock.Any(), userID, &passportID).Return(&profileCore.Professional{
					VerticalID: &verticalID,
				}, nil)

				return mock
			},
			getUserProfileMock: func() *MockUserProfile {
				mock := NewMockUserProfile(ctrl)

				mock.EXPECT().V1UserGetByID(gomock.Any(), userID).Return(&user, nil)

				return mock
			},
			getItemPlatformMock: func() *MockItemPlatformClient {
				mock := NewMockItemPlatformClient(ctrl)

				mock.EXPECT().GetByID(gomock.Any(), itemID, gomock.Any()).Return(&item, nil)

				return mock
			},
			expectedResult: dictsParameters.ProcessData{
				IsWysiwyg:         false,
				User:              &user,
				Item:              &item,
				Employee:          nil,
				Draft:             &draft,
				UserVerticalID:    &verticalID,
				SellerAddressData: &dictsParameters.SellerAddressData{},
			},
		},
		{
			name:       "private_wo_draft",
			userID:     userID,
			passportID: &passportID,
			data: Data{
				UserID:     userID,
				PassportID: &passportID,
				DeviceID:   "",
				UserData: components.DictsParametersRequestForm{
					ItemId:     &itemID,
					IsEmployee: operations.Pointer(false),
				},
			},

			getSessionIDGeneratorMock: func() *MockSessionIDGenerator {
				return NewMockSessionIDGenerator(ctrl)
			},
			getDraftStorageMock: func() *MockDraftStorage {
				return NewMockDraftStorage(ctrl)
			},
			getAccountsHierarchyMock: func() *MockAccountsHierarchy {
				return NewMockAccountsHierarchy(ctrl)
			},
			getTariffAggregatorMock: func() *MockTariffAggregator {
				mock := NewMockTariffAggregator(ctrl)

				mock.EXPECT().HasActiveFeature(gomock.Any(), userID, dicts.TariffContractWysiwyg).Return(false, nil)

				return mock
			},
			getProfileCoreMock: func() *MockProfileCoreInstance {
				return NewMockProfileCoreInstance(ctrl)
			},
			getUserProfileMock: func() *MockUserProfile {
				mock := NewMockUserProfile(ctrl)

				mock.EXPECT().V1UserGetByID(gomock.Any(), userID).Return(&user, nil)

				return mock
			},
			getItemPlatformMock: func() *MockItemPlatformClient {
				mock := NewMockItemPlatformClient(ctrl)

				mock.EXPECT().GetByID(gomock.Any(), itemID, gomock.Any()).Return(&item, nil)

				return mock
			},
			expectedResult: dictsParameters.ProcessData{
				IsWysiwyg:         false,
				User:              &user,
				Item:              &item,
				Employee:          nil,
				Draft:             nil,
				UserVerticalID:    nil,
				SellerAddressData: &dictsParameters.SellerAddressData{},
			},
		},
	}
	metricsMock := NewMockMetrics(ctrl)
	healthMetrics := NewPublishHealthMetrics(metricsMock, NewMockHybridCache(ctrl))
	catalogsMock := NewMockCatalogs(ctrl)

	log, _ := logger.New(logger.WithEnabled(false))
	for _, tc := range tt {
		t.Run(tc.name, func(t *testing.T) {
			dictsParams := New(
				log,
				NewMockDraftHashVerifier(ctrl),
				tc.getSessionIDGeneratorMock(),
				tc.getDraftStorageMock(),
				tc.getUserProfileMock(),
				tc.getAccountsHierarchyMock(),
				NewMockNavigationManager(ctrl),
				NewMockEventSender(ctrl),
				NewMockSellerAddressesClient(ctrl),
				NewMockAddressBookClient(ctrl),
				tc.getTariffAggregatorMock(),
				NewMockComposition(ctrl),
				NewMockFormManager(ctrl),
				NewMockPublishItemActions(ctrl),
				NewMockCoreGeo(ctrl),
				NewMockUserLimits(ctrl),
				NewMockVas(ctrl),
				NewMockParamsProcessor(ctrl),
				NewMockGorelkin(ctrl),
				NewMockGeoResolver(ctrl),
				tc.getItemPlatformMock(),
				NewMockItemPlatformExpander(ctrl),
				tc.getProfileCoreMock(),
				NewMockTogglesManager(ctrl),
				healthMetrics,
				NewMockRejectionInfoGetterInterface(ctrl),
				catalogsMock,
			)

			result, err := dictsParams.getProcessData(
				context.Background(),
				tc.userID,
				tc.passportID,
				tc.draftID,
				nil,
				tc.data,
				nil,
			)

			require.NoError(t, err)
			require.NotNil(t, result)
			assert.Equal(t, tc.expectedResult, *result)
		})
	}
}

type mapMatcher struct {
	mapData map[string]interface{}
}

func (i mapMatcher) Matches(x interface{}) bool {
	data := x.(map[string]interface{})

	if reflect.DeepEqual(data, i.mapData) {
		return true
	}

	return false
}

func (i mapMatcher) String() string {
	return fmt.Sprintf("matches item %#v", i)
}

func mapMatcherData(data map[string]interface{}) gomock.Matcher {
	return mapMatcher{mapData: data}
}

func Test_isNeedToFill(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	type mockStruct struct {
		data   Data
		layout string
		result bool
	}

	type mockFunc func(c *MockComposition, tm *MockTogglesManager) mockStruct

	for testName, testCase := range map[string]struct{ mock mockFunc }{
		"disable by forceErrorChecking not found": {mock: func(c *MockComposition, tm *MockTogglesManager) mockStruct {
			return mockStruct{
				data:   Data{},
				layout: "",
				result: false,
			}
		}},
		"disable by forceErrorChecking is false": {mock: func(c *MockComposition, tm *MockTogglesManager) mockStruct {
			return mockStruct{
				data: Data{
					UserData: schemaComponents.DictsParametersRequestForm{
						ForceErrorChecking: operations.Pointer(false),
					},
				},
				layout: "",
				result: false,
			}
		}},
		"disable by not found ItemId": {mock: func(c *MockComposition, tm *MockTogglesManager) mockStruct {
			return mockStruct{
				data: Data{
					UserData: schemaComponents.DictsParametersRequestForm{
						ForceErrorChecking: operations.Pointer(true),
					},
				},
				layout: "",
				result: false,
			}
		}},
		"disable by wrong ItemId": {mock: func(c *MockComposition, tm *MockTogglesManager) mockStruct {
			return mockStruct{
				data: Data{
					UserData: schemaComponents.DictsParametersRequestForm{
						ItemId:             operations.Pointer(int64(0)),
						ForceErrorChecking: operations.Pointer(true),
					},
				},
				layout: "",
				result: false,
			}
		}},
		"disable by toggle": {mock: func(c *MockComposition, tm *MockTogglesManager) mockStruct {
			tm.EXPECT().GetBool("sellerx_item_fill_parameters").Return(false, nil)
			return mockStruct{
				data: Data{
					UserData: schemaComponents.DictsParametersRequestForm{
						ItemId:             operations.Pointer(int64(1)),
						ForceErrorChecking: operations.Pointer(true),
					},
				},
				layout: "",
				result: false,
			}
		}},
		"enable with ItemId": {mock: func(c *MockComposition, tm *MockTogglesManager) mockStruct {
			tm.EXPECT().GetBool("sellerx_item_fill_parameters").Return(true, nil)
			return mockStruct{
				data: Data{
					UserData: schemaComponents.DictsParametersRequestForm{
						ItemId:             operations.Pointer(int64(1)),
						ForceErrorChecking: operations.Pointer(true),
					},
				},
				layout: "",
				result: true,
			}
		}},
		"enable with layout": {mock: func(c *MockComposition, tm *MockTogglesManager) mockStruct {
			tm.EXPECT().GetBool("sellerx_item_fill_parameters").Return(true, nil)
			return mockStruct{
				data: Data{
					UserData: schemaComponents.DictsParametersRequestForm{
						ForceErrorChecking: operations.Pointer(true),
					},
				},
				layout: "mav_edit",
				result: true,
			}
		}},
	} {
		t.Run(testName, func(t *testing.T) {

			composition := NewMockComposition(ctrl)
			togglesManager := NewMockTogglesManager(ctrl)

			mock := testCase.mock(composition, togglesManager)

			l := Parameters{
				composition:    composition,
				togglesManager: togglesManager,
			}

			ctx := context.Background()

			result := l.isNeedToFill(ctx, mock.data, mock.layout)
			assert.Equal(t, mock.result, result)
		})
	}
}`,
};

export { CODE_SAMPLES };
