import h from '@macrostrat/hyper';
import {useState} from 'react';
import {
  InputGroup,
  Button,
  ButtonGroup,
  Collapse,
  Slider,
  Card,
  Intent,
  FormGroup,
  ISliderProps
} from '@blueprintjs/core';
import {
  useAppState,
  useAppDispatch,
  useTypes,
  SearchBackend,
  ThresholdKey} from './provider'
import {Spec} from 'immutability-helper'

interface ConfidenceSliderProps extends ISliderProps {
  id: ThresholdKey,
  label: string,
  labelInfo?: string
}

const ConfidenceSlider = (props: ConfidenceSliderProps)=>{
  const {id, label, max: _max, labelInfo, ...rest} = props
  const {filterParams} = useAppState()
  const dispatch = useAppDispatch()

  const max = _max ?? 1

  const confProps = {min: 0, max, initialValue: max, stepSize: 0.02, labelStepSize: 0.2}
  const onChange = (value: number)=> dispatch({type: 'set-threshold', key: id, value})

  const value = filterParams[id]

  return h(FormGroup, {label, labelInfo, inline: true},
    h(Slider, {...confProps, ...rest, onChange, value})
  )
}

const SliderPanel = (props)=>{
  return h("div.slider-panel", [
    h(ConfidenceSlider, {
      id: "base_confidence",
      label: "Base confidence"
    }),
    h(ConfidenceSlider, {
      id: "postprocessing_confidence",
      label: "Post confidence"
    }),
    h(ConfidenceSlider, {
      id: "area",
      label: "Area",
      labelInfo: "(px²)",
      min: 30000,
      max: 100000,
      stepSize: 10000,
      labelStepSize: 30000,
      labelRenderer: (v)=>`${v/1000}k`
    })
  ])
}

const TypeSelector = (props)=> {
  const types = useTypes()
  const dispatch = useAppDispatch()
  const {filterParams} = useAppState()
  const filterType = filterParams.type

  const setFilterType = (cls: FeatureType|null)=>()=>{
    if (filterType == cls?.id) return
    dispatch({type: 'set-filter-type', featureType: cls})
  }

  return h("div.type-selector", [
    h("h3", "Extraction type"),
    h("div.filter-types", [
      h(ButtonGroup, [...types, null].map(d => h(Button, {
        intent: filterType == d?.id ? Intent.PRIMARY : null,
        onClick: setFilterType(d)
      }, d?.name ?? "All")))
    ])
  ])
}

const SearchBackendSelector = ()=>{
  const {searchBackend} = useAppState()
  const dispatch = useAppDispatch()

  const propsFor = (backend: SearchBackend)=>({
    intent: searchBackend == backend ? Intent.PRIMARY : null,
    onClick() {
      if (backend == searchBackend) return
      dispatch({type: 'set-search-backend', backend})
    },
    children: backend,
    small: true
  })

  return h(FormGroup, {label: h("h4", "Backend")},
    h(ButtonGroup, [
      h(Button, propsFor(SearchBackend.Anserini)),
      h(Button, propsFor(SearchBackend.ElasticSearch))
    ])
  )
}

const FilterPanel = (props)=> {
  const {isOpen} = props

  return h(Collapse, {isOpen}, [
    h(Card, {className: 'filter-controls bp3-text'}, [
      h(TypeSelector),
      h("div.tuning-controls", [
        h("h4", "Thresholds"),
        h(SliderPanel),
      ]),
      h(SearchBackendSelector)
    ])
  ])
}

interface SearchInterfaceProps {}

const Searchbar = (props: SearchInterfaceProps)=>{

  const {filterParams} = useAppState()
  const dispatch = useAppDispatch()

  const updateFilter = (spec: Spec<FilterParams>)=>{
    dispatch({type: 'update-filter', spec})
  }

  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(true)

  const types = useTypes()
  const name = types.find(d => d.id == filterParams.type)?.name ?? "All types"

  const rightElement = h(Button, {
    minimal: false,
    intent: filterPanelOpen ? Intent.PRIMARY : null,
    rightIcon: "filter",
    onClick(){ setFilterPanelOpen(!filterPanelOpen) }
  }, name)

  const updateQuery = (value)=> updateFilter({query: {$set: value}})

  //const updateQuery = debounce(__updateQuery, 500);
  const onChange = event => updateQuery(event.target.value);

  return h('div.search-interface', [
    h(InputGroup, {
      className: 'main-search',
      large: true,
      value: filterParams.query,
      leftIcon: 'search',
      placeholder: "Search extractions",
      onChange,
      rightElement
    }),
    h(FilterPanel, {isOpen: filterPanelOpen})
  ]);
}

export {Searchbar}
